import assert from 'node:assert/strict';
import {sql,setUser,onBatch} from './runtime.mjs';
import * as cb from './route.mjs';import * as projects from './projects.mjs';import * as team from './team.mjs';import * as review from './review.mjs';import * as billing from './bills.mjs';import * as profile from './profile-server.mjs';
import {billItem} from './bill-types.mjs';
import {COMPANY_OWNER as owner} from './server.mjs';
import {today,canReviewExpense} from './cashbook.mjs';
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++};const id=()=>crypto.randomUUID(),date=today(),admin=()=>setUser(owner,'owner@example.test');
async function json(mod,data,status=200,method='POST'){const r=await mod[method](new Request('https://test.example/api',{method,headers:{Origin:'https://test.example','Content-Type':'application/json'},body:JSON.stringify(data)}));const out=await r.json();assert.equal(r.status,status,JSON.stringify(out));checks++;return out;}
async function get(params='',status=200){const r=await billing.GET(new Request('https://test.example/api/bills'+params));const out=await r.json();assert.equal(r.status,status,JSON.stringify(out));checks++;return out;}
async function entry(data){const f=new FormData();for(const[k,v]of Object.entries({id:id(),action:'transaction',type:'expense',account:'project',amount:'125.55',date,description:'Test supplies',party:'Customer',category:'Materials',...data}))f.set(k,v);const r=await cb.POST(new Request('https://test.example/api/cashbook',{method:'POST',headers:{Origin:'https://test.example'},body:f}));eq(r.status,200);return (await r.json()).id;}
const tx=id=>sql.prepare('SELECT * FROM transactions WHERE id=?').get(id);
const p=id(),q=id();admin();for(const [key,name]of[[p,'Assigned'],[q,'Other']])await json(projects,{id:key,action:'create',name,location:'',profit_percent:'20',contract_value:'100000'});
const members={};for(const role of['supervisor','engineer','manager','staff']){members[role]=id();await json(team,{id:members[role],name:role,email:role+'@example.test',password:'Test-password-2026!',role,project_ids:role==='staff'?[]:[p]});}
setUser('supervisor');const direct=await entry({project_id:p});setUser('manager');await json(review,{id:direct,action:'approve',revision:0});eq(tx(direct).status,'approved');eq(tx(direct).verified_by,null);eq(tx(direct).approved_name,'manager');eq(tx(direct).amount,12555);
setUser('engineer');await json(review,{id:direct,action:'verify',revision:1},409);await json(review,{id:direct,action:'return',revision:1,note:'Too late'},409);eq(tx(direct).status,'approved');
admin();await json(review,{id:direct,action:'approve',revision:1},409);
const own=await entry({project_id:p});await json(review,{id:own,action:'approve',revision:0});eq(tx(own).approved_by,owner);
setUser('supervisor');const returned=await entry({project_id:p});setUser('engineer');await json(review,{id:returned,action:'return',revision:0,note:'Receipt unclear'});admin();await json(review,{id:returned,action:'approve',revision:1,note:'Original checked in office'});eq(tx(returned).status,'approved');
const unrelated=await entry({project_id:q});setUser('manager');await json(review,{id:unrelated,action:'approve',revision:0},403);
admin();const race=await entry({project_id:p}),beforeAudit=sql.prepare('SELECT COUNT(*) n FROM audit_events').get().n;onBatch(d=>d.prepare("UPDATE transactions SET status='approved',revision=revision+1 WHERE id=?").run(race));await json(review,{id:race,action:'approve',revision:0},409);eq(sql.prepare('SELECT COUNT(*) n FROM audit_events').get().n,beforeAudit);
eq(canReviewExpense({id:owner,role:'admin'},tx(own)),false);eq(canReviewExpense({id:owner,role:'admin'},tx(unrelated)),true);
// Profile photos are included as authenticated URLs for Team & portals, never as image bytes.
const userId=sql.prepare('SELECT user_id FROM team_members WHERE id=?').get(members.supervisor).user_id;
sql.prepare('INSERT INTO user_profiles (user_id,owner,photo_data,photo_type,revision,last_event_id,updated_at) VALUES (?,?,?,?,?,?,?)').run(userId,owner,'private-image-data','image/png',3,id(),new Date().toISOString());
const book=await(await cb.GET(new Request('https://test.example/api/cashbook'))).json();eq(book.members.find(m=>m.id===members.supervisor).photo_url,`/api/profile-photo?user_id=${userId}&v=3`);eq(JSON.stringify(book.members).includes('private-image-data'),false);
// Standalone documents never touch transactions, projects, HR or cashbook audit records.
const accounting=()=>JSON.stringify({tx:sql.prepare('SELECT * FROM transactions ORDER BY id').all(),projects:sql.prepare('SELECT * FROM projects ORDER BY id').all(),audit:sql.prepare('SELECT * FROM audit_events ORDER BY id').all()});
const before=accounting(),draft={id:id(),date,customer_name:'Sample client',customer_address:'Sample address',items:[{description:'Design consultation',quantity:'2.5',rate:'100.01'},{description:'Sample fee',quantity:'1',rate:'10'}],notes:'Thank you'};
const standalone=(await json(billing,draft)).bill;eq(standalone.total,26003);eq(standalone.kind,'bill');eq(standalone.source_transaction_id,null);eq(standalone.number.startsWith('TH-B-'),true);eq(accounting(),before);
eq((await json(billing,draft)).bill.id,standalone.id);eq(sql.prepare('SELECT COUNT(*) n FROM bills').get().n,1);
for(const role of['supervisor','engineer','staff']){setUser(role);await get('',403);await json(billing,{...draft,id:id()},403);await json(billing,{id:standalone.id,action:'void',revision:0,reason:'No access'},403,'PATCH');}
setUser('manager');await get('?id='+standalone.id,404);const managerBill=(await json(billing,{...draft,id:id(),customer_name:'Manager client'})).bill;eq((await get()).bills.length,1);admin();eq((await get()).bills.length,2);
await json(billing,{...draft,id:id(),items:[{description:'Bad',quantity:'-1',rate:'1'}]},400);await json(billing,{...draft,id:id(),items:[]},400);await json(billing,{...draft,id:id(),items:[{description:'Bad',quantity:'1',rate:'0'}]},400);
eq(billItem('Half unit','0.5','0.01').amount,1);eq(billItem('Fraction','1.125','123.45').amount,13888);
await json(billing,{id:managerBill.id,action:'void',revision:0,reason:'Replace details'},200,'PATCH');await json(billing,{id:managerBill.id,action:'void',revision:0,reason:'Repeated'},409,'PATCH');eq(accounting(),before);
// Receipts copy the full payment, ignoring client-supplied monetary fields.
const income=await entry({type:'income',project_id:p,amount:'1234.56',payment_ref:'BANK-123'}),cashBeforeReceipt=accounting();setUser('manager');const source=(await get('?source_id='+income)).source;eq(source.amount,123456);
const receipt=(await json(billing,{id:id(),source_transaction_id:income,source_revision:0,total:1,items:[{description:'Tampered',quantity:'1',rate:'1'}],customer_name:'Wrong'})).bill;
eq(receipt.total,123456);eq(receipt.customer_name,'Customer');eq(receipt.payment_ref,'BANK-123');eq(receipt.kind,'receipt');eq(receipt.source_state,'current');eq(accounting(),cashBeforeReceipt);
eq((await get('?source_id='+income)).bill.id,receipt.id);await json(billing,{id:id(),source_transaction_id:income,source_revision:0},409);
admin();await entry({id:income,action:'edit',revision:'0',type:'income',project_id:p,amount:'2345.67',payment_ref:'BANK-124'});eq((await get('?id='+receipt.id)).bill.source_state,'changed');await json(billing,{id:id(),source_transaction_id:income,source_revision:0},409);
await json(billing,{id:receipt.id,action:'void',revision:0,reason:'Payment corrected'},200,'PATCH');const replacement=(await json(billing,{id:id(),source_transaction_id:income,source_revision:1})).bill;eq(replacement.total,234567);eq(replacement.source_state,'current');
await json(cb,{id:income,revision:1,reason:'Wrong cash entry'},200,'PATCH');eq((await get('?id='+replacement.id)).bill.source_state,'deleted');await json(billing,{id:id(),source_transaction_id:income,source_revision:2},400);
const company=await entry({type:'income',account:'company',amount:'100'});setUser('manager');await get('?source_id='+company,403);await json(billing,{id:id(),source_transaction_id:company,source_revision:0},403);
admin();const concurrent=await entry({type:'income',project_id:p,amount:'500'});
const responses=await Promise.all([1,2].map(()=>billing.POST(new Request('https://test.example/api/bills',{method:'POST',headers:{Origin:'https://test.example','Content-Type':'application/json'},body:JSON.stringify({id:id(),source_transaction_id:concurrent,source_revision:0})}))));eq(responses.map(r=>r.status).sort(),[200,409]);eq(sql.prepare('SELECT COUNT(*) n FROM bills WHERE source_transaction_id=? AND voided_at IS NULL').get(concurrent).n,1);
const csrf=await billing.POST(new Request('https://test.example/api/bills',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify(draft)}));eq(csrf.status,403);
setUser(null);await get('',401);
console.log(JSON.stringify({billing_approval_assertions_passed:checks,coverage:['direct manager/admin approval is final','approval races and assigned-project access','private team photo URLs','standalone bills do not mutate accounts','exact paise arithmetic','role isolation','idempotency and concurrent receipts','server-sourced receipt amounts','changed/deleted source detection','cancellation and replacement','CSRF and authentication']}));
