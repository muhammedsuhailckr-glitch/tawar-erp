'use client';
import BrandLogo from '../brand-logo';
import {useState} from 'react';
import {LockKeyhole,ArrowRight} from 'lucide-react';
export default function Login(){const[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(busy)return;setBusy(true);setError('');const form=new FormData(e.currentTarget);try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',email:form.get('email'),password:form.get('password')})}),out=await r.json() as any;if(!r.ok)throw new Error(out.error);window.location.assign('/')}catch(e){setError((e as Error).message);setBusy(false)}}
 return <main className="access-screen"><BrandLogo/><section className="access-card"><LockKeyhole size={29}/><h1>Sign in to your workspace</h1><p>Use the email and password for your company account.</p><form onSubmit={submit} className="login-form"><label className="field"><span>Email</span><input name="email" type="email" autoComplete="username" maxLength={200} required/></label><label className="field"><span>Password</span><input name="password" type="password" autoComplete="current-password" maxLength={128} required/></label>{error&&<p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}>{busy?'Signing in…':'Sign in'}<ArrowRight size={17}/></button></form><small>Your administrator creates accounts and assigns access.</small><a className="text-button" href="/">Back to workspace</a></section></main>
}
