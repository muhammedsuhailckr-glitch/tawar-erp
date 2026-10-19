import assert from 'node:assert/strict';
import {sql,onBatch} from './runtime.mjs';
import {hashPassword,verifyPassword,digest} from './password.mjs';
import {getCurrentUser,createSession} from './auth.mjs';
import {POST} from './auth-route.mjs';
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++};const ok=v=>{assert.ok(v);checks++};
const base='https://workspace.example',password='Example-password-12345',adminId='test-admin';
const hash=await hashPassword(password);ok(hash!==await hashPassword(password));eq(await verifyPassword(password,hash),true);eq(await verifyPassword('incorrect-password',hash),false);
sql.prepare('INSERT INTO auth_users (id,email,name,password_hash,is_admin,active,created_at) VALUES (?,?,?,?,1,1,?)').run(adminId,'admin@example.test','Administrator',hash,new Date().toISOString());
const request=(cookie)=>new Request(base+'/api/cashbook',{headers:cookie?{cookie}:{}});
async function call(action,data={},cookie,origin=base){const r=await POST(new Request(base+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{}),...(cookie?{cookie}:{})},body:JSON.stringify({action,...data})}));const body=await r.clone().json();return{r,body,cookie:r.headers.get('set-cookie')?.split(';')[0]}}
for(const raw of ['{','null','[]','true']){
 const response=await POST(new Request(base+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:raw}));
 eq(response.status,400);eq(response.headers.get('Cache-Control'),'no-store');
}
eq(sql.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n,0);
eq(await getCurrentUser(new Request(base,{headers:{'x-user-id':adminId,'x-admin':'true'}})),null);
eq((await call('login',{email:'admin@example.test',password},undefined,'https://other.example')).r.status,403);
eq((await call('login',{email:'admin@example.test',password},undefined,null)).r.status,403);
eq((await call('login',{email:'admin@example.test',password:'bad'})).r.status,401);
let login=await call('login',{email:'admin@example.test',password});eq(login.r.status,200);ok(login.r.headers.get('set-cookie').includes('HttpOnly'));ok(login.r.headers.get('set-cookie').includes('SameSite=Strict'));ok(login.r.headers.get('set-cookie').includes('Secure'));
let cookie=login.cookie;eq((await getCurrentUser(request(cookie))).isAdmin,true);const token=cookie.split('=')[1];ok(!sql.prepare('SELECT token_hash FROM auth_sessions').all().some(r=>r.token_hash===token));eq(sql.prepare('SELECT token_hash FROM auth_sessions').get().token_hash,await digest(token));eq(await getCurrentUser(request(cookie+'; '+cookie)),null);
await assert.rejects(()=>createSession(adminId,request(cookie),'obsolete-hash'));checks++;
sql.prepare('UPDATE auth_sessions SET expires_at=0').run();eq(await getCurrentUser(request(cookie)),null);
login=await call('login',{email:'admin@example.test',password});cookie=login.cookie;eq((await call('password',{current_password:'bad',password:'Replacement-password-1'},cookie)).r.status,400);
const changed=await call('password',{current_password:password,password:'Replacement-password-1'},cookie);eq(changed.r.status,200);eq(await getCurrentUser(request(cookie)),null);eq((await call('login',{email:'admin@example.test',password})).r.status,401);
login=await call('login',{email:'admin@example.test',password:'Replacement-password-1'});cookie=login.cookie;eq(login.r.status,200);
// A credential-change conflict must not revoke sessions created by its winner.
const winnerHash=await hashPassword('Concurrent-winner-password');const before=sql.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n;
onBatch(s=>s.prepare('UPDATE auth_users SET password_hash=? WHERE id=?').run(winnerHash,adminId));eq((await call('password',{current_password:'Replacement-password-1',password:'Losing-password-change'},cookie)).r.status,409);eq(sql.prepare('SELECT COUNT(*) n FROM auth_sessions').get().n,before);
eq((await call('logout',{},cookie)).r.status,200);eq(await getCurrentUser(request(cookie)),null);
for(let i=0;i<10;i++)eq((await call('login',{email:'missing@example.test',password})).r.status,401);eq((await call('login',{email:'missing@example.test',password})).r.status,429);
const user='test-supervisor';sql.prepare('INSERT INTO auth_users (id,email,name,password_hash,is_admin,active,created_at) VALUES (?,?,?,?,0,1,?)').run(user,'supervisor@example.test','Supervisor',hash,new Date().toISOString());
eq((await call('login',{email:'supervisor@example.test',password})).r.status,401);await assert.rejects(()=>createSession(user,request(),hash));checks++;
sql.prepare('INSERT INTO team_members (id,owner,name,email,user_id,role,active,created_at) VALUES (?,?,?,?,?,?,1,?)').run('member','tawar-workspace','Supervisor','supervisor@example.test',user,'supervisor',new Date().toISOString());
login=await call('login',{email:'supervisor@example.test',password});eq(login.r.status,200);eq((await getCurrentUser(request(login.cookie))).isAdmin,false);
sql.prepare('UPDATE auth_users SET active=0 WHERE id=?').run(user);eq(await getCurrentUser(request(login.cookie)),null);await assert.rejects(()=>createSession(user,request(),hash));checks++;
console.log(JSON.stringify({auth_assertions_passed:checks,coverage:['invalid JSON rejection','salted password hashes','origin enforcement','opaque secure sessions','header spoofing rejected','expiry and logout','password change and revocation','credential race gate','login throttling','staff membership and disabled accounts']}));
