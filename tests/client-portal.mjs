import assert from 'node:assert/strict';
import {sql,setUser} from './runtime.mjs';
import {COMPANY_OWNER as owner} from './server.mjs';
import * as team from './team.mjs';import * as projects from './projects.mjs';import * as cb from './route.mjs';import * as client from './client.mjs';import * as receipt from './receipt.mjs';import * as hr from './hr.mjs';import * as profile from './profile.mjs';import * as people from './people.mjs';import * as review from './review.mjs';import * as bills from './bills.mjs';
let checks=0;function eq(a,b){assert.deepEqual(a,b);checks++}const id=()=>crypto.randomUUID();
function request(path='',body,method='POST'){return new Request('https://test.example/api/'+path,body?{method,headers:{Origin:'https://test.example','Content-Type':'application/json'},body:JSON.stringify(body)}:undefined)}
async function call(mod,body,status=200){const r=await mod.POST(request('',body));const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));checks++;return d;}
setUser(owner);const p=id(),q=id();for(const [pid,name] of [[p,'Client project'],[q,'Private project']])await call(projects,{id:pid,action:'create',name,location:'Kerala',profit_percent:'20',contract_value:'10000'});
const member=id();await call(team,{id:member,name:'Client One',email:'client@example.test',password:'Client-test-password-123',role:'client',project_ids:[p]});
const user=sql.prepare('SELECT user_id FROM team_members WHERE id=?').get(member).user_id;
async function entry(project,type,category='Rent',amount='100'){const f=new FormData();for(const [k,v] of Object.entries({id:id(),action:'transaction',type,project_id:project||'',account:project?'project':'company',amount,category,date:'2026-01-01',description:project===q?'PRIVATE SITE':'Visible entry',party:'Private contact'}))f.set(k,v);const r=await cb.POST(new Request('https://test.example/api/cashbook',{method:'POST',headers:{Origin:'https://test.example'},body:f}));const d=await r.json();eq(r.status,200);return d.id;}
const payment=await entry(p,'income','Client payment','1000'),expense=await entry(p,'expense');await entry(q,'expense');await entry(null,'expense','Rent');
const voided=await entry(p,'expense');sql.prepare('UPDATE transactions SET voided_at=?,review_note=?,receipt_key=? WHERE id=?').run('2026-01-02','PRIVATE REVIEW','secret-key',voided);sql.prepare('UPDATE transactions SET review_note=?,receipt_key=? WHERE id=?').run('PRIVATE REVIEW','secret-key',expense);
setUser(user,'client@example.test');let r=await client.GET(request('client'));eq(r.status,200);eq(r.headers.get('Cache-Control'),'no-store');const d=await r.json();eq(d.projects.map(p=>p.id),[p]);eq(d.entries.map(t=>t.id).sort(),[expense,payment].sort());eq(d.entries.find(t=>t.id===payment).amount,100000);eq(d.entries.find(t=>t.id===expense).category,'Rent');eq(Object.keys(d.projects[0]).sort(),['contract_value','id','location','name']);eq(Object.keys(d.entries[0]).sort(),['amount','category','date','description','id','project_id','type']);eq(/PRIVATE|secret-key|company_share|profit_bps|password_hash|Private contact/.test(JSON.stringify(d)),false);
eq(d.projects[0].contract_value,null);
setUser(owner);const projectEdit={id:p,action:'update',name:'Client project',location:'Kerala',profit_percent:'20',contract_value:'123456.78'};
await call(projects,{...projectEdit,contract_value_confirmed:'true'},400);
await call(projects,{...projectEdit,contract_value:'0',contract_value_confirmed:true},400);
await call(projects,{...projectEdit,contract_value_confirmed:true});
setUser(user,'client@example.test');eq((await (await client.GET(request('client'))).json()).projects[0].contract_value,12345678);
setUser(owner);await call(projects,{...projectEdit,contract_value_confirmed:false});
setUser(user,'client@example.test');const privateView=await (await client.GET(request('client'))).json();eq(privateView.projects[0].contract_value,null);eq(JSON.stringify(privateView).includes('12345678'),false);
eq((await client.GET(request('client?project_id='+q))).status,403);
const book=await (await cb.GET(request('cashbook'))).json();eq(book.user.role,'client');for(const key of ['transactions','projects','audit','employees','attendance','leaves','payroll','members'])eq(book[key],[]);
for(const route of [cb,team,projects,hr,review,bills])await call(route,{id:expense,action:'delete'},403);
for(const route of [receipt,profile,people])eq((await route.GET(request('x?id='+expense))).status,403);
eq((await cb.PATCH(request('',{id:expense,revision:0,reason:'delete'},'PATCH'))).status,403);
sql.prepare('DELETE FROM project_members WHERE member_id=?').run(member);eq((await (await client.GET(request('client'))).json()).entries,[]);
sql.prepare('UPDATE team_members SET active=0 WHERE id=?').run(member);eq((await client.GET(request('client'))).status,403);setUser(null);eq((await client.GET(request('client'))).status,401);
setUser(owner);eq((await client.GET(request('client?project_id='+p))).status,200);
console.log('Client isolation, read-only access and Rent checks passed: '+checks);
