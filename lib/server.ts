import {RequestError} from '@/lib/request';
import {receiptStorage} from '@/lib/receipt-storage';
import { env } from 'cloudflare:workers';
import { getCurrentUser } from '@/lib/auth';
import { today, type Role } from '@/lib/cashbook';
// One company workspace; roles come from authenticated accounts and assigned membership.
export const COMPANY_OWNER='tawar-workspace';
export class AppError extends Error{constructor(message:string,public status=400){super(message)}}
export type Actor={id:string;name:string;email:string;role:Role;memberId:string|null;projects:string[]};
export function db(){if(!env.DB)throw new AppError('Records are temporarily unavailable. Please try again.',503);return env.DB}
export function bucket(){return receiptStorage(db(),env.BUCKET)}
export async function actor(request:Request,write=false,allowClient=false):Promise<Actor>{
 const u=await getCurrentUser(request);if(!u)throw new AppError('Sign in to open your Tawar Homes portal.',401);
 if(write){const origin=request.headers.get('origin');if(origin!==new URL(request.url).origin)throw new AppError('Request not allowed.',403)}
 if(u.isAdmin)return{id:u.userId,name:u.fullName||'Tawar Homes administrator',email:u.email,role:'admin',memberId:null,projects:[]};
 const m=await db().prepare('SELECT * FROM team_members WHERE owner=? AND user_id=?').bind(COMPANY_OWNER,u.userId).first<any>();
 if(!m||!m.active)throw new AppError('Your account has not been assigned an active portal. Contact the administrator.',403);
 if(m.role==='client'&&!allowClient)throw new AppError('This action is not available in the client portal.',403);
 const projects=await db().prepare('SELECT project_id FROM project_members WHERE member_id=? AND owner=?').bind(m.id,COMPANY_OWNER).all<{project_id:string}>();
 return{id:u.userId,name:m.name,email:m.email,role:m.role as Role,memberId:m.id,projects:projects.results.map(p=>p.project_id)};
}
export function admin(a:Actor){if(a.role!=='admin')throw new AppError('Only the administrator can manage company accounts, staff and payroll.',403)}
export function canProject(a:Actor,id:string){if(a.role==='admin')return;if(!a.projects.includes(id))throw new AppError('This project is not assigned to your portal.',403)}
export async function projectFor(a:Actor,id:string){canProject(a,id);const p=await db().prepare('SELECT * FROM projects WHERE id=? AND owner=?').bind(id,COMPANY_OWNER).first<any>();if(!p)throw new AppError('Project not found.',404);return p}
export async function transactionFor(a:Actor,id:string){const t=await db().prepare('SELECT * FROM transactions WHERE id=? AND owner=?').bind(id,COMPANY_OWNER).first<any>();if(!t)throw new AppError('Entry not found.',404);if(a.role!=='admin'){if(!t.project_id||t.account==='company')throw new AppError('Company account entries are private to the administrator.',403);canProject(a,t.project_id);if(a.role==='staff'||(a.role==='supervisor'&&t.created_by!==a.id))throw new AppError('You can only open your own expense entries.',403)}return t}
export function textField(v:unknown,label:string,max=200){if(typeof v!=='string'||!v.trim()||v.trim().length>max)throw new AppError(`${label} is required (up to ${max} characters).`);return v.trim()}
export function optional(v:unknown,max=200){return typeof v==='string'?v.trim().slice(0,max):''}
export function validDate(v:unknown,future=false){const s=String(v||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s||s<'2000-01-01'||s>(future?'2100-12-31':today()))throw new AppError(future?'Enter a valid date.':'Enter a valid date up to today.');return s}
export function uuid(v:unknown){const s=String(v);if(!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(s))throw new AppError('Invalid entry ID.');return s}
export function audit(a:Actor,id:string,entity:string,action:string,note='',details:unknown={}){return db().prepare('INSERT OR IGNORE INTO audit_events (id,owner,entity_id,action,actor_id,actor_name,at,note,details) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,COMPANY_OWNER,entity,action,a.id,a.name,new Date().toISOString(),note,JSON.stringify(details))}
export function entityAudit(table:'transactions'|'projects'|'leave_requests',a:Actor,id:string,entity:string,action:string,note='',details:unknown={}){return db().prepare(`INSERT OR IGNORE INTO audit_events (id,owner,entity_id,action,actor_id,actor_name,at,note,details) SELECT ?,?,?,?,?,?,?,?,? FROM ${table} WHERE id=? AND owner=? AND last_event_id=?`).bind(id,COMPANY_OWNER,entity,action,a.id,a.name,new Date().toISOString(),note,JSON.stringify(details),entity,COMPANY_OWNER,id)}
export function txAudit(a:Actor,id:string,entity:string,action:string,note='',details:unknown={}){return entityAudit('transactions',a,id,entity,action,note,details)}
export function fail(e:unknown){if(e instanceof AppError||e instanceof RequestError)return Response.json({error:e.message},{status:e.status,headers:{'Cache-Control':'no-store'}});if(e instanceof Error&&/^(Enter a valid amount|Amount must)/.test(e.message))return Response.json({error:e.message},{status:400,headers:{'Cache-Control':'no-store'}});console.error('Tawar Homes request failed',e);return Response.json({error:'Could not complete this request. Your form is kept; please try again.'},{status:503,headers:{'Cache-Control':'no-store'}})}
export async function receiptFile(file:FormDataEntryValue|null){if(!(file instanceof File)||!file.size)return null;if(file.size>5*1024*1024)throw new AppError('Receipt must be 5 MB or smaller.');if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type))throw new AppError('Use a JPG, PNG, WebP or PDF receipt.');const bytes=await file.arrayBuffer(),h=new Uint8Array(bytes).slice(0,12);const valid=file.type==='application/pdf'?String.fromCharCode(...h.slice(0,5))==='%PDF-':file.type==='image/jpeg'?h[0]===255&&h[1]===216:file.type==='image/png'?h[0]===137&&h[1]===80&&h[2]===78:String.fromCharCode(...h.slice(0,4))==='RIFF'&&String.fromCharCode(...h.slice(8,12))==='WEBP';if(!valid)throw new AppError('This file does not match its image or PDF format.');const key=COMPANY_OWNER+'/'+crypto.randomUUID();await bucket().put(key,bytes,{httpMetadata:{contentType:file.type}});return{key,name:file.name.slice(0,160),type:file.type}}
