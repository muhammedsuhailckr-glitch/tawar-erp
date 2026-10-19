import {RequestError} from '@/lib/request';
import {env} from 'cloudflare:workers';
import {digest,secretToken} from './password.mjs';
export type AuthUser={userId:string;email:string;fullName:string;isAdmin:boolean};
export class AuthError extends Error{constructor(message:string,public status=400){super(message)}}
export const SESSION_COOKIE='tawar_session';
const SESSION_SECONDS=8*60*60;
export function authDb(){if(!env.DB)throw new AuthError('Account storage is unavailable.',503);return env.DB}
export function sameOrigin(request:Request){if(request.headers.get('origin')!==new URL(request.url).origin)throw new AuthError('Request not allowed.',403)}
export function sessionToken(request:Request){const values=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(SESSION_COOKIE+'=')).map(s=>s.slice(SESSION_COOKIE.length+1));return values.length===1&&/^[a-f0-9]{64}$/.test(values[0])?values[0]:null}
export async function getCurrentUser(request:Request):Promise<AuthUser|null>{
 const token=sessionToken(request);if(!token)return null;
 const row=await authDb().prepare('SELECT u.id,u.email,u.name,u.is_admin FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1').bind(await digest(token),Math.floor(Date.now()/1000)).first<any>();
 return row?{userId:row.id,email:row.email,fullName:row.name,isAdmin:row.is_admin===1}:null;
}
export function cookie(request:Request,token:string,remove=false){return `${SESSION_COOKIE}=${remove?'':token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${remove?0:SESSION_SECONDS}${new URL(request.url).protocol==='https:'?'; Secure':''}`}
export async function createSession(userId:string,request:Request,expectedPasswordHash:string){const token=secretToken(),now=Math.floor(Date.now()/1000);const results=await authDb().batch([authDb().prepare('DELETE FROM auth_sessions WHERE expires_at<=?').bind(now),authDb().prepare('INSERT INTO auth_sessions (token_hash,user_id,expires_at,created_at) SELECT ?,id,?,? FROM auth_users WHERE id=? AND active=1 AND password_hash=? AND (is_admin=1 OR EXISTS (SELECT 1 FROM team_members WHERE user_id=auth_users.id AND active=1))').bind(await digest(token),now+SESSION_SECONDS,now,userId,expectedPasswordHash)]);if(!results[1].meta.changes)throw new AuthError('Account changed. Sign in again.',401);return cookie(request,token)}
export async function throttle(key:string,limit:number){const now=Math.floor(Date.now()/1000),id=await digest(key);await authDb().prepare('DELETE FROM auth_throttles WHERE expires_at<=?').bind(now).run();const row=await authDb().prepare('INSERT INTO auth_throttles (id,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(id,now+15*60).first<{attempts:number}>();if(!row||row.attempts>limit)throw new AuthError('Too many attempts. Please try again in 15 minutes.',429);return id}
export function authFailure(error:unknown){if(error instanceof AuthError||error instanceof RequestError)return Response.json({error:error.message},{status:error.status,headers:{'Cache-Control':'no-store'}});console.error('Account request failed',error);return Response.json({error:'Unable to complete this account request. Please try again.'},{status:503,headers:{'Cache-Control':'no-store'}})}
