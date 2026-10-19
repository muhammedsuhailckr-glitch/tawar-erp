import assert from 'node:assert/strict';
import {sql,setUser,onBatch} from './runtime.mjs';
import * as profile from './profile.mjs';
import * as people from './people.mjs';
import * as photo from './profile-photo.mjs';
import * as team from './team.mjs';
import {financialAnalysis,personAnalysis} from './analytics.mjs';
import {emptyBook} from './cashbook.mjs';
const owner='tawar-workspace';let checks=0;
const eq=(a,b)=>{assert.deepEqual(a,b);checks++};
const request=path=>new Request('https://test.example'+path);
async function read(mod,path='/api/profile',status=200){const response=await mod.GET(request(path));eq(response.status,status);return response;}
async function save(data={},status=200,origin='https://test.example'){
 const form=new FormData();for(const[k,v]of Object.entries({name:'Profile name',phone:'+91 90000 00000',city:'Kochi',job_title:'Site team',bio:'Working on construction projects',revision:'0',...data}))form.set(k,v);
 const response=await profile.POST(new Request('https://test.example/api/profile',{method:'POST',headers:{Origin:origin},body:form}));const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));checks++;return result;
}
sql.prepare('INSERT INTO auth_users (id,email,name,password_hash,is_admin,active,created_at) VALUES (?,?,?,?,1,1,?)').run(owner,'owner@example.test','Owner','test-only','2026-01-01');
for(const name of['alice','bob']){
 const response=await team.POST(new Request('https://test.example/api/team',{method:'POST',headers:{Origin:'https://test.example','Content-Type':'application/json'},body:JSON.stringify({id:crypto.randomUUID(),name,email:name+'@example.test',password:'Dashboard-test-password-123',role:'staff',project_ids:[]})}));eq(response.status,200);
}
const alice=sql.prepare("SELECT id FROM auth_users WHERE email='alice@example.test'").get().id,bob=sql.prepare("SELECT id FROM auth_users WHERE email='bob@example.test'").get().id;
setUser(null);await read(profile,'/api/profile',401);await read(people,'/api/people',401);await read(photo,'/api/profile-photo?user_id='+alice,401);await save({},401);
setUser('alice','alice@example.test');let response=await read(profile);eq(response.headers.get('cache-control'),'no-store');let data=(await response.json()).profile;eq(data.name,'alice');eq(data.revision,0);eq(data.photo_url,null);
await read(people,'/api/people',403);await read(photo,'/api/profile-photo?user_id='+bob,403);await save({user_id:bob},403);await save({},403,'https://other.example');
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH5kAAAAASUVORK5CYII=','base64');
data=(await save({photo:new File([image],'photo.png',{type:'image/png'}),role:'admin',email:'changed@example.test'})).profile;
eq(data.role,'staff');eq(data.email,'alice@example.test');eq(data.revision,1);eq(data.phone,'+91 90000 00000');eq(!!data.photo_url,true);eq('photo_data' in data,false);
eq(sql.prepare('SELECT name FROM auth_users WHERE id=?').get(alice).name,'Profile name');eq(sql.prepare('SELECT name FROM team_members WHERE user_id=?').get(alice).name,'Profile name');
response=await read(photo,data.photo_url);eq(response.headers.get('content-type'),'image/png');eq(response.headers.get('cache-control'),'private, no-store');eq(response.headers.get('x-content-type-options'),'nosniff');eq(Buffer.from(await response.arrayBuffer()),image);
await save({revision:'0',name:'Stale replacement'},409);eq(sql.prepare('SELECT name FROM auth_users WHERE id=?').get(alice).name,'Profile name');
await save({revision:'1',photo:new File(['<svg/>'],'bad.svg',{type:'image/svg+xml'})},400);await save({revision:'1',photo:new File(['fake'],'fake.png',{type:'image/png'})},400);
await save({revision:'1',photo:new File([Buffer.alloc(513*1024)],'big.jpg',{type:'image/jpeg'})},400);await save({revision:'1',phone:'hello'},400);await save({revision:'1',bio:'a'.repeat(501)},400);
onBatch(s=>s.prepare('UPDATE user_profiles SET revision=revision+1 WHERE user_id=?').run(alice));await save({revision:'1',name:'Concurrent replacement'},409);eq(sql.prepare('SELECT name FROM auth_users WHERE id=?').get(alice).name,'Profile name');
data=(await save({revision:'2',city:'Calicut'})).profile;eq(data.revision,3);eq(!!data.photo_url,true);
setUser('bob','bob@example.test');await read(photo,'/api/profile-photo?user_id='+alice,403);data=(await (await read(profile)).json()).profile;eq(data.city,'');eq(data.photo_url,null);
setUser(owner);response=await read(people,'/api/people');data=await response.json();eq(data.people.length,3);eq(data.people.find(p=>p.user_id===alice).city,'Calicut');eq(JSON.stringify(data).includes('password_hash'),false);eq(JSON.stringify(data).includes('photo_data'),false);await read(photo,'/api/profile-photo?user_id='+alice);
setUser('alice','alice@example.test');data=(await save({revision:'3',remove_photo:'true'})).profile;eq(data.photo_url,null);await read(photo,'/api/profile-photo?user_id='+alice,404);
sql.prepare('UPDATE team_members SET active=0 WHERE user_id=?').run(alice);await read(profile,'/api/profile',403);await read(photo,'/api/profile-photo?user_id='+alice,403);
// Totals must not count an internal company allocation as a second receipt.
const project={id:'p',name:'Project',location:'',contract_value:100000,profit_bps:2000};
const tx=(id,date,type,amount,extra={})=>({id,date,type,amount,project_id:'p',account:'project',company_share:0,voided_at:null,category:'Materials',created_by:'alice',status:'submitted',...extra});
const rows=[tx('old','2026-01-10','income',10000,{company_share:2000}),tx('income','2026-02-05','income',20000),tx('expense','2026-02-06','expense',5000,{status:'returned',verified_by:'engineer'}),tx('funds','2026-02-07','income',3000,{account:'company',project_id:null}),tx('rent','2026-02-08','expense',1000,{account:'company',project_id:null,category:'Rent',created_by:'admin'}),tx('salary','2026-02-09','expense',2000,{account:'company',project_id:null,category:'Salary',employee_id:'employee',created_by:'admin'}),tx('deleted','2026-02-10','expense',90000,{voided_at:'2026-02-11'}),tx('future','2026-03-01','income',50000)];
const employee={id:'employee',member_id:'member',name:'Alice',job_title:'Site team',department:'Projects',joined_on:'2026-01-01'};
const book={...emptyBook,projects:[project,{...project,id:'unset',contract_value:0}],transactions:rows,payroll:[rows[5]],employees:[employee],attendance:[{employee_id:'employee',date:'2026-02-01',status:'Present'},{employee_id:'employee',date:'2026-02-02',status:'Half day'},{employee_id:'employee',date:'2026-03-01',status:'Absent'}],leaves:[{employee_id:'employee',start_date:'2026-01-31',end_date:'2026-02-02',status:'pending'}]};
const range={from:'2026-02-01',to:'2026-02-28'},a=financialAnalysis(book,range);
eq(a.income,23000);eq(a.expenses,8000);eq(a.net,15000);eq(a.opening,10000);eq(a.closing,25000);eq(a.opening+a.net,a.closing);eq(a.companyCash+a.projectCash,a.closing);eq(a.projects[0].pending,70000);eq(a.projects[1].pending,null);eq(a.unsetValues,1);eq(a.allocations,0);eq(a.projects[0].cash,23000);eq(a.companyCash,2000);eq(a.monthly.length,1);eq(a.categories.reduce((sum,row)=>sum+row.amount,0),8000);
const person=personAnalysis(book,'alice','member',range);eq(person.expenses,5000);eq(person.entries.length,1);eq(person.paidSalary,2000);eq(person.present,1);eq(person.halfDays,1);eq(person.absent,0);eq(person.pendingLeave,1);eq(personAnalysis(book,'engineer',null,range).checked,1);eq(personAnalysis(book,'bob',null,range).paidSalary,0);
const total=financialAnalysis(book,{from:'',to:''});eq(total.closing,75000);eq(total.income-total.expenses,total.closing);eq(total.projects[0].pending,20000);
console.log(JSON.stringify({dashboard_assertions_passed:checks,coverage:['profile privacy and role protection','image validation and authenticated photos','atomic profile revisions and names','photo preservation and removal','admin directory without password/photo data','disabled accounts','company/project reconciliation','date boundaries','employee-linked salary and attendance','deleted-entry exclusion']}));
