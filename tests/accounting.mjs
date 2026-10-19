import assert from 'node:assert/strict';
import {sql,setUser,onBatch} from './runtime.mjs';
import * as cb from './route.mjs';import * as projects from './projects.mjs';import * as team from './team.mjs';import * as review from './review.mjs';import * as hr from './hr.mjs';import * as receipt from './receipt.mjs';
import {COMPANY_OWNER as owner} from './server.mjs';import {projectBalance,companyBalance,balance,receipts,today,paise,percent} from './cashbook.mjs';
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++};const ok=v=>{assert.ok(v);checks++};const id=()=>crypto.randomUUID();const date=today();const admin=()=>setUser(owner,'owner@example.test');
async function json(mod,data,status=200,method='POST'){if(mod===team&&data.name&&!data.password)data={...data,password:'Accounting-test-password-123'};const r=await mod[method](new Request('https://test.example/api',{method,headers:{'Content-Type':'application/json','Origin':'https://test.example'},body:JSON.stringify(data)}));const b=await r.json();assert.equal(r.status,status,JSON.stringify(b));checks++;return b}
async function entry(data={},status=200){const f=new FormData();for(const[k,v]of Object.entries({action:'transaction',id:id(),type:'expense',account:'project',amount:'100',date,description:'Materials delivered',party:'Supplier',category:'Materials',...data}))f.set(k,v);const r=await cb.POST(new Request('https://test.example/api',{method:'POST',headers:{Origin:'https://test.example'},body:f}));const b=await r.json();assert.equal(r.status,status,JSON.stringify(b));checks++;return b}
async function book(status=200){const r=await cb.GET(new Request('https://test.example/api'));const b=await r.json();eq(r.status,status);return b}
const tx=k=>sql.prepare('SELECT * FROM transactions WHERE id=?').get(k);const count=()=>sql.prepare('SELECT COUNT(*) AS n FROM audit_events').get().n;
// Bad requests are client errors, and must never mutate accounting records.
const beforeInvalid=count();
for(const [mod,method] of [[projects,'POST'],[team,'POST'],[hr,'POST'],[review,'POST'],[cb,'PATCH']]){
 for(const raw of ['{','null','[]','42']){
  const response=await mod[method](new Request('https://test.example/api',{method,headers:{'Content-Type':'application/json',Origin:'https://test.example'},body:raw}));
  eq(response.status,400);eq(response.headers.get('Cache-Control'),'no-store');
 }
}
const invalidForm=await cb.POST(new Request('https://test.example/api',{method:'POST',headers:{'Content-Type':'multipart/form-data',Origin:'https://test.example'},body:'broken multipart'}));
eq(invalidForm.status,400);eq(count(),beforeInvalid);
const p=id(),q=id();for(const[k,n,r]of[[p,'Test site','20'],[q,'Other site','17.5']])await json(projects,{action:'create',id:k,name:n,location:'Kerala',profit_percent:r,contract_value:'1000000'});
eq(tx('legacy-tx').amount,10000000);eq(tx('legacy-tx').company_share,0);eq(tx('legacy-tx').status,'approved');
const roles={};for(const role of['supervisor','engineer','manager','staff']){roles[role]=id();await json(team,{id:roles[role],name:role,email:role+'@example.test',role,project_ids:role==='staff'?[]:[p]})}
setUser('supervisor');const expense=(await entry({project_id:p,amount:'1234.56',receipt:new File(['%PDF-1.4 test'],'receipt.pdf',{type:'application/pdf'})})).id;eq(tx(expense).status,'submitted');eq(projectBalance((await book()).transactions,p),-123456);
await entry({project_id:q},403);await entry({account:'company'},403);await entry({type:'income',project_id:p},403);await json(review,{id:expense,action:'verify',revision:0},403);
let b=await book();eq(b.projects.length,1);eq(b.projects[0].contract_value,0);eq(b.members.length,0);eq(b.employees.length,0);ok(!JSON.stringify(b).includes('receipt_key'));
const rr=await receipt.GET(new Request('https://test.example/api/receipt?id='+expense));eq(rr.status,200);eq(rr.headers.get('Cache-Control'),'private, no-store');
// The normal engineer → manager path remains supported alongside direct final approval.

setUser('engineer');await json(review,{id:expense,action:'verify',revision:0});eq(tx(expense).status,'verified');const audits=count();await json(review,{id:expense,action:'verify',revision:0},409);eq(count(),audits);
setUser('manager');await json(review,{id:expense,action:'approve',revision:1});eq(tx(expense).status,'approved');eq(projectBalance((await book()).transactions,p),-123456);
admin();const first=(await entry({type:'income',project_id:p,amount:'10000'})).id;eq(tx(first).company_share,200000);eq(tx(first).is_first_payment,1);const second=(await entry({type:'income',project_id:p,amount:'1000'})).id;eq(tx(second).company_share,0);b=await book();eq(receipts(b.transactions,p),1100000);eq(projectBalance(b.transactions,p),776544);eq(balance(b.transactions),companyBalance(b.transactions)+b.projects.reduce((s,x)=>s+projectBalance(b.transactions,x.id),0));
await json(projects,{action:'update',id:p,name:'Test site',location:'Kerala',profit_percent:'15',contract_value:'1200000'},400);
await json(projects,{action:'update',id:p,name:'Test site',location:'Kerala',profit_percent:'20',contract_value:'1200000'});
await entry({account:'company',amount:'5000',category:'Other overheads'});eq(companyBalance((await book()).transactions),-300000);
const employee=id();await json(hr,{action:'employee',id:employee,name:'Staff employee',job_title:'Office coordinator',monthly_salary:'30000',joined_on:'2026-01-01',employment_type:'Permanent',member_id:roles.staff,email:'staff@example.test'});
const salary=id();await json(hr,{action:'salary',id:salary,employee_id:employee,salary_month:date.slice(0,7),date,base_pay:'30000',allowance:'2000',deduction:'500'});eq(tx(salary).amount,3150000);eq(tx(salary).account,'company');await json(hr,{action:'salary',id:id(),employee_id:employee,salary_month:date.slice(0,7),date,base_pay:'30000'},400);
await json(hr,{action:'attendance',id:id(),employee_id:employee,date,status:'Present'});await json(hr,{action:'attendance',id:id(),employee_id:employee,date,status:'Half day'});eq(sql.prepare('SELECT COUNT(*) n FROM attendance').get().n,1);
setUser('staff');b=await book();eq(b.transactions.length,0);eq(b.employees.length,1);eq(b.payroll.length,1);eq(b.payroll[0].amount,3150000);eq(b.attendance[0].status,'Half day');await json(hr,{action:'salary',id:id(),employee_id:employee},403);eq((await receipt.GET(new Request('https://test.example/api/receipt?id='+expense))).status,403);
const leave=id();await json(hr,{action:'leave',id:leave,employee_id:employee,start_date:date,end_date:date,type:'Casual',reason:'Family appointment'});await json(hr,{action:'leave',id:id(),employee_id:employee,start_date:date,end_date:date,type:'Casual',reason:'Overlap'},400);
admin();await json(hr,{action:'leave_review',id:leave,status:'approved'});const c=count();await json(hr,{action:'leave_review',id:leave,status:'rejected',note:'Repeated review'},409);eq(count(),c);
setUser('supervisor');const returned=(await entry({project_id:p,amount:'450'})).id;setUser('engineer');await json(review,{id:returned,revision:0,action:'return',note:'Correct invoice amount'});setUser('supervisor');await entry({id:returned,action:'resubmit',revision:'1',project_id:p,amount:'475'});eq(tx(returned).status,'submitted');eq(tx(returned).amount,47500);eq(tx(returned).revision,2);
admin();await json(cb,{id:first,revision:tx(first).revision,reason:'Incorrect client receipt'},200,'PATCH');eq(projectBalance((await book()).transactions,p),100000-123456-47500);eq(companyBalance((await book()).transactions),-3650000);
await json(projects,{action:'allocate',id:p});eq(tx(second).company_share,20000);eq(tx(second).is_first_payment,1);await json(projects,{action:'allocate',id:p},409);
// Concurrent first receipts: exactly one allocation; no internal cash creation.
await Promise.all([entry({type:'income',project_id:q,amount:'1000.01'}),entry({type:'income',project_id:q,amount:'2000.03'})]);eq(sql.prepare('SELECT COUNT(*) n FROM transactions WHERE project_id=? AND is_first_payment=1').get(q).n,1);
const stale=id();await json(projects,{id:stale,action:'create',name:'Concurrent settings',location:'',profit_percent:'20',contract_value:'10000'});const auditBefore=count();onBatch(s=>s.prepare('UPDATE projects SET profit_bps=1500 WHERE id=?').run(stale));await entry({type:'income',project_id:stale,amount:'100'},409);eq(count(),auditBefore);eq(sql.prepare('SELECT COUNT(*) n FROM transactions WHERE project_id=?').get(stale).n,0);
const raceReceipt=(await entry({type:'income',project_id:stale,amount:'2.30'})).id;eq(tx(raceReceipt).company_share,35);await json(cb,{id:raceReceipt,revision:tx(raceReceipt).revision,reason:'Test replacement'},200,'PATCH');const auditBeforeUpdate=count();onBatch(s=>s.prepare('UPDATE transactions SET voided_at=NULL WHERE id=?').run(raceReceipt));await json(projects,{id:stale,action:'update',name:'Concurrent settings',location:'',profit_percent:'20',contract_value:'10000'},409);eq(count(),auditBeforeUpdate);
await json(team,{id:roles.supervisor,action:'deactivate'});setUser('supervisor');await book(403);setUser(null);await book(401);
eq(paise('12.34'),1234);eq(percent('17.25'),1725);assert.throws(()=>paise('0'));assert.throws(()=>paise('1.234'));
console.log(JSON.stringify({passed:checks,coverage:['invalid request rejection without writes','legacy migration preservation','negative project and company balances','first-payment allocation and concurrency','project value and receipts','supervisor-engineer-manager workflow','role and receipt isolation','returned entry correction','salary and duplicate month','attendance upsert','staff self-service leave and payroll','stale review audits','void allocation reversal','percentage update race','disabled and unauthenticated access']},null,2));
