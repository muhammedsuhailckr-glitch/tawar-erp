import assert from 'node:assert/strict';
import {sql,setUser,onBatch} from './runtime.mjs';
import * as cb from './route.mjs';
import * as projects from './projects.mjs';
import * as team from './team.mjs';
import * as review from './review.mjs';
import * as hr from './hr.mjs';
import * as receipt from './receipt.mjs';
import {today,projectBalance,companyBalance} from './cashbook.mjs';
const owner='tawar-workspace',id=()=>crypto.randomUUID(),date=today();let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++};
const admin=()=>setUser(owner),who=role=>setUser(role,role+'@example.test');
const tx=id=>sql.prepare('SELECT * FROM transactions WHERE id=?').get(id);
const events=id=>sql.prepare('SELECT count(*) n FROM audit_events WHERE entity_id=?').get(id).n;
async function json(mod,data,status=200,method='POST'){
 const response=await mod[method](new Request('https://test.example/api',{method,headers:{Origin:'https://test.example','Content-Type':'application/json'},body:JSON.stringify(data)}));
 const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));checks++;return result;
}
async function money(data={},status=200){
 const form=new FormData();for(const[k,v]of Object.entries({action:'transaction',id:id(),type:'expense',account:'project',amount:'100',date,description:'Editable entry',party:'Test supplier',category:'Materials',...data}))form.set(k,v);
 const response=await cb.POST(new Request('https://test.example/api',{method:'POST',headers:{Origin:'https://test.example'},body:form}));const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));checks++;return result;
}
const p=id(),q=id();for(const project of[p,q])await json(projects,{action:'create',id:project,name:project,profit_percent:'20',contract_value:'10000'});
for(const role of['supervisor','other','engineer','manager','staff'])await json(team,{id:id(),name:role,email:role+'@example.test',password:'Entry-controls-test-123',role:role==='other'?'supervisor':role,project_ids:role==='staff'?[]:[p]});
who('supervisor');const entry=(await money({project_id:p,receipt:new File(['%PDF-1.4 original'],'original.pdf',{type:'application/pdf'})})).id;
const originalKey=tx(entry).receipt_key;
await money({id:entry,action:'edit',revision:'0',project_id:p,amount:'125',description:'Correct amount'});eq(tx(entry).amount,12500);eq(tx(entry).revision,1);eq(tx(entry).receipt_key,originalKey);
await money({id:entry,action:'edit',revision:'0',project_id:p,amount:'900'},409);await money({id:entry,action:'edit',project_id:p},409);
await money({id:entry,action:'edit',revision:'1',project_id:q},403);
await money({id:entry,action:'edit',revision:'1',account:'company',category:'Other overheads'},400);
for(const role of['other','engineer','manager','staff']){
 who(role);await money({id:entry,action:'edit',revision:'1',project_id:p},403);await json(cb,{id:entry,revision:1,reason:'Cannot delete another person’s entry'},403,'PATCH');
}
who('engineer');await json(review,{id:entry,revision:1,action:'verify'});
who('manager');await json(review,{id:entry,revision:2,action:'approve'});eq(tx(entry).status,'approved');
who('supervisor');await money({id:entry,action:'edit',revision:'3',project_id:p,amount:'150'});eq(tx(entry).status,'submitted');eq(tx(entry).verified_by,null);eq(tx(entry).approved_by,null);eq(tx(entry).review_note,'');
eq(projectBalance([tx(entry)],p),-15000);
const audit=JSON.parse(sql.prepare("SELECT details FROM audit_events WHERE entity_id=? AND action='edited' ORDER BY at DESC LIMIT 1").get(entry).details);eq(audit.previous.status,'approved');eq(audit.current.amount,15000);
const before=events(entry);onBatch(s=>s.prepare('UPDATE transactions SET revision=revision+1 WHERE id=?').run(entry));await money({id:entry,action:'edit',revision:'4',project_id:p,amount:'999'},409);eq(tx(entry).amount,15000);eq(events(entry),before);
await json(cb,{id:entry,reason:'Missing revision'},409,'PATCH');await json(cb,{id:entry,revision:4,reason:'Stale deletion'},409,'PATCH');
await json(cb,{id:entry,revision:5,reason:'Duplicate expense'},200,'PATCH');eq(!!tx(entry).voided_at,true);eq(projectBalance([tx(entry)],p),0);eq(tx(entry).receipt_key,originalKey);
eq((await receipt.GET(new Request('https://test.example/api/receipt?id='+entry))).status,200);
await money({id:entry,action:'edit',revision:'6',project_id:p},409);await json(cb,{id:entry,revision:6,reason:'Repeat delete'},409,'PATCH');
// Creators retain controls when they move to another site portal, within assigned projects.
const creator=sql.prepare("SELECT id FROM auth_users WHERE email='supervisor@example.test'").get().id;
for(const role of['engineer','manager']){
 sql.prepare("UPDATE team_members SET role='supervisor' WHERE user_id=?").run(creator);who('supervisor');const own=(await money({project_id:p})).id;
 sql.prepare('UPDATE team_members SET role=? WHERE user_id=?').run(role,creator);
 await money({id:own,action:'edit',revision:'0',project_id:p,amount:'80'});await json(cb,{id:own,revision:1,reason:'Creator correction'},200,'PATCH');
}
admin();
const first=(await money({type:'income',project_id:p,amount:'1000'})).id,second=(await money({type:'income',project_id:p,amount:'200'})).id;
await money({id:first,action:'edit',revision:'0',type:'income',project_id:p,amount:'1500'});eq(tx(first).company_share,30000);eq(tx(first).profit_bps_snapshot,2000);eq(tx(second).company_share,0);eq(companyBalance([tx(first),tx(second)]),30000);eq(projectBalance([tx(first),tx(second)],p),140000);
await money({id:first,action:'edit',revision:'1',type:'income',project_id:q,amount:'1500'},400);
const overhead=(await money({account:'company',category:'Other overheads'})).id;await money({id:overhead,action:'edit',revision:'0',account:'company',category:'Utilities',amount:'75'});eq(tx(overhead).category,'Utilities');eq(tx(overhead).amount,7500);
const employee=id();await json(hr,{action:'employee',id:employee,name:'Payroll person',job_title:'Accountant',employment_type:'Permanent',monthly_salary:'1000',joined_on:'2026-01-01'});
const salary=id(),fields={id:salary,employee_id:employee,salary_month:date.slice(0,7),date,base_pay:'1000',allowance:'50',deduction:'25'};
await json(hr,{...fields,action:'salary'});await json(hr,{...fields,action:'salary_edit',revision:0,base_pay:'1100'});eq(tx(salary).amount,112500);eq(tx(salary).base_pay,110000);eq(tx(salary).allowance,5000);eq(tx(salary).deduction,2500);
await json(hr,{...fields,action:'salary_edit',revision:0},409);await money({id:salary,action:'edit',revision:'1',account:'company',category:'Other overheads'},400);
who('manager');await json(hr,{...fields,action:'salary_edit',revision:1},403);
admin();await json(cb,{id:salary,revision:1,reason:'Replace incorrect salary'},200,'PATCH');await json(hr,{...fields,action:'salary',id:id()});
setUser(null);await money({id:first,action:'edit',revision:'1',type:'income',project_id:p},401);await json(cb,{id:first,revision:1,reason:'Anonymous'},401,'PATCH');
console.log(JSON.stringify({entry_control_assertions_passed:checks,coverage:['creator/admin permissions across site portals','review resets after approved edits','stale revisions and concurrent edits','receipt preservation','soft-delete balance reversal and history','first-payment allocation preservation','salary component consistency','unauthenticated denial']}));
