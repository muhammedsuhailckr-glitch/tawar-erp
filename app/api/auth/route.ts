import {jsonObject} from '@/lib/request';
import {authDb,AuthError,sameOrigin,getCurrentUser,createSession,sessionToken,cookie,throttle,authFailure} from '@/lib/auth';
import {digest,verifyPassword,hashPassword,validPassword} from '@/lib/password.mjs';
export async function POST(request:Request){try{
 sameOrigin(request);const d=await jsonObject(request) as any;const action=d.action;
 if(action==='logout'){const token=sessionToken(request);if(token)await authDb().prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await digest(token)).run();return Response.json({ok:true},{headers:{'Set-Cookie':cookie(request,'',true),'Cache-Control':'no-store'}})}
 if(action==='password'){
  const u=await getCurrentUser(request);if(!u)throw new AuthError('Sign in to change your password.',401);
  await throttle('password:'+u.userId,5);
  if(!validPassword(d.password))throw new AuthError('Use a new password of 12 to 128 characters.');
  const record=await authDb().prepare('SELECT password_hash FROM auth_users WHERE id=? AND active=1').bind(u.userId).first<{password_hash:string}>();
  if(!record||!await verifyPassword(d.current_password,record.password_hash))throw new AuthError('Current password is incorrect.',400);
  const nextHash=await hashPassword(d.password);const changed=await authDb().batch([authDb().prepare('UPDATE auth_users SET password_hash=? WHERE id=? AND password_hash=? AND active=1').bind(nextHash,u.userId,record.password_hash),authDb().prepare('DELETE FROM auth_sessions WHERE user_id=? AND EXISTS (SELECT 1 FROM auth_users WHERE id=? AND password_hash=?)').bind(u.userId,u.userId,nextHash)]);if(!changed[0].meta.changes)throw new AuthError('Your account changed. Sign in again.',409);
  return Response.json({ok:true},{headers:{'Set-Cookie':cookie(request,'',true),'Cache-Control':'no-store'}});
 }
 if(action!=='login')throw new AuthError('Unknown account action.');
 const email=typeof d.email==='string'?d.email.trim().toLowerCase():'';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200||typeof d.password!=='string'||d.password.length>128)throw new AuthError('Enter your email and password.');
 await throttle('ip:'+(request.headers.get('cf-connecting-ip')||'local'),80);
 const attempt=await throttle('login:'+email,10);
 const user=await authDb().prepare('SELECT * FROM auth_users WHERE email=?').bind(email).first<any>();
 const matches=await verifyPassword(d.password,user?.password_hash||'pbkdf2_sha256$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
 const member=user&&!user.is_admin?await authDb().prepare('SELECT id FROM team_members WHERE user_id=? AND active=1').bind(user.id).first():null;
 if(!user||!user.active||!matches||(!user.is_admin&&!member))throw new AuthError('Email or password is incorrect, or this account is disabled.',401);
 await authDb().prepare('DELETE FROM auth_throttles WHERE id=?').bind(attempt).run();
 return Response.json({ok:true},{headers:{'Set-Cookie':await createSession(user.id,request,user.password_hash),'Cache-Control':'no-store'}});
 }catch(error){return authFailure(error)}}
