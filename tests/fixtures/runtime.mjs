import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
export const sql=new DatabaseSync(':memory:');
const root=process.env.APP_TEST_ROOT+'/drizzle/';
sql.exec(fs.readFileSync(root+'0000_cloudy_the_phantom.sql','utf8'));
const owner='tawar-workspace';
sql.prepare('INSERT INTO projects (id,owner,name,location,created_at) VALUES (?,?,?,?,?)').run('legacy-project',owner,'Preserved project','Kottappuram','2026-01-01');
sql.prepare('INSERT INTO transactions (id,owner,type,amount,date,description,party,project_id,category,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run('legacy-tx',owner,'income',10000000,'2026-01-01','Preserved payment','Existing client','legacy-project','Client payment','2026-01-01');
for(const name of fs.readdirSync(root).filter(n=>/^\d.*\.sql$/.test(n)&&!n.startsWith('0000')).sort())sql.exec(fs.readFileSync(root+name,'utf8'));
let who={userId:owner,email:'owner@example.test',fullName:'QA administrator',isAdmin:true};
export function setUser(id,email=id+'@example.test'){who=id?{userId:id===owner?id:(sql.prepare('SELECT id FROM auth_users WHERE email=?').get(email)?.id||id),email,fullName:id,isAdmin:id===owner}:null}
export async function getCurrentUser(){return who}
let beforeBatch=null;export function onBatch(fn){beforeBatch=fn}
function statement(q,args=[]){return{bind(...v){return statement(q,v)},async first(){return sql.prepare(q).get(...args)||null},async run(){return{meta:{changes:Number(sql.prepare(q).run(...args).changes)}}},async all(){return result()},exec:result};function result(){const s=sql.prepare(q);if(s.columns().length)return{results:s.all(...args),meta:{changes:0}};return{results:[],meta:{changes:Number(s.run(...args).changes)}}}}
const blobs=new Map();export const env={DB:{prepare:statement,async batch(stmts){if(beforeBatch){const fn=beforeBatch;beforeBatch=null;fn(sql)}sql.exec('BEGIN');try{const out=stmts.map(s=>s.exec());sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}},BUCKET:{async put(k,v,meta){blobs.set(k,{body:v,meta})},async get(k){return blobs.get(k)},async delete(k){blobs.delete(k)}}};
