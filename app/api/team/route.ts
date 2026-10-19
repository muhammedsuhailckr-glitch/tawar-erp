import {jsonObject} from '@/lib/request';
import {actor,admin,db,fail,AppError,uuid,textField,COMPANY_OWNER,audit} from '@/lib/server';
import {hashPassword,validPassword} from '@/lib/password.mjs';
export async function POST(request:Request){try{
 const a=await actor(request,true);admin(a);const d=await jsonObject(request) as any,id=uuid(d.id);const existing=await db().prepare('SELECT * FROM team_members WHERE id=? AND owner=?').bind(id,COMPANY_OWNER).first<any>();
 if(d.action==='deactivate'||d.action==='activate'){
  if(!existing)throw new AppError('Team member not found.',404);const enabled=d.action==='activate'?1:0;
  await db().batch([db().prepare('UPDATE team_members SET active=? WHERE id=? AND owner=?').bind(enabled,id,COMPANY_OWNER),db().prepare('UPDATE auth_users SET active=? WHERE id=? AND is_admin=0').bind(enabled,existing.user_id),db().prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(existing.user_id),audit(a,crypto.randomUUID(),id,enabled?'portal_enabled':'portal_disabled')]);return Response.json({ok:true});
 }
 const name=textField(d.name,'Name',100),email=textField(d.email,'Email',200).toLowerCase(),role=String(d.role);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new AppError('Enter a valid email address.');
 if(email===a.email.toLowerCase())throw new AppError('Your administrator account is already enabled.');
 if(!['supervisor','engineer','manager','staff','client'].includes(role))throw new AppError('Choose a valid portal role.');
 if(existing&&existing.email!==email)throw new AppError('A sign-in email cannot be changed. Disable this member and create the correct account.');
 const password=typeof d.password==='string'?d.password:'';
 if((!existing||password)&&!validPassword(password))throw new AppError('Use a password of 12 to 128 characters.');
 const ids=Array.from(new Set(Array.isArray(d.project_ids)?d.project_ids.map(String):[])) as string[];
 if(ids.length>60)throw new AppError('Choose at most 60 projects.');
 for(const p of ids)if(!await db().prepare('SELECT id FROM projects WHERE owner=? AND id=?').bind(COMPANY_OWNER,p).first())throw new AppError('A selected project no longer exists.');
 const userId=existing?.user_id||crypto.randomUUID(),hash=password?await hashPassword(password):null,now=new Date().toISOString();
 const userStatement=existing?(hash?db().prepare('UPDATE auth_users SET name=?,password_hash=? WHERE id=? AND is_admin=0').bind(name,hash,userId):db().prepare('UPDATE auth_users SET name=? WHERE id=? AND is_admin=0').bind(name,userId)):db().prepare('INSERT INTO auth_users (id,email,name,password_hash,is_admin,active,created_at) VALUES (?,?,?,?,0,1,?)').bind(userId,email,name,hash,now);
 const statements=[userStatement,existing?db().prepare('UPDATE team_members SET name=?,role=? WHERE id=? AND owner=?').bind(name,role,id,COMPANY_OWNER):db().prepare('INSERT INTO team_members (id,owner,name,email,user_id,role,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,COMPANY_OWNER,name,email,userId,role,now),db().prepare('DELETE FROM project_members WHERE member_id=? AND owner=?').bind(id,COMPANY_OWNER),...ids.map(p=>db().prepare('INSERT INTO project_members (id,owner,member_id,project_id) VALUES (?,?,?,?)').bind(crypto.randomUUID(),COMPANY_OWNER,id,p)),...(existing&&hash?[db().prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(userId)]:[]),audit(a,crypto.randomUUID(),id,existing?'portal_updated':'portal_created','',{name,email,role,project_ids:ids,password_reset:!!existing&&!!hash})];
 try{await db().batch(statements)}catch(e){if(String(e).includes('UNIQUE'))throw new AppError('An account already uses this email.');throw e}return Response.json({id});
 }catch(e){return fail(e)}}
