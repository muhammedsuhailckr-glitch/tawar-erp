'use client';
import {useState} from 'react';
import {LockKeyhole,Pencil,Save,SlidersHorizontal} from 'lucide-react';
import type {PersonProfile} from '@/lib/profile';
import {roleNames} from '@/lib/cashbook';
import {ProfileAvatar} from './dashboard-parts';
import {AppearancePreference} from './theme-provider';
import ProfileEditor from './profile-editor';
import type {WorkspacePreferences} from './workspace-preferences';

function PreferencesEditor({preferences,onSave}:{preferences:WorkspacePreferences;onSave:(preferences:WorkspacePreferences)=>void}) {
  const [message,setMessage]=useState(''),[error,setError]=useState('');
  function save(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setMessage('');setError('');const data=new FormData(event.currentTarget);try{onSave({dashboardPeriod:data.get('dashboardPeriod')==='all'?'all':'month',tableDensity:data.get('tableDensity')==='compact'?'compact':'comfortable'});setMessage('Preferences saved.');}catch(error){setError((error as Error).message);}}
  return <section className="panel preferences-editor"><div className="panel-heading"><div><h2>Preferences</h2><p>Saved for your account in this browser.</p></div><SlidersHorizontal size={20}/></div><form onSubmit={save}><div className="profile-form-grid">
    <label className="field"><span>Default dashboard period</span><select name="dashboardPeriod" defaultValue={preferences.dashboardPeriod}><option value="month">This month</option><option value="all">All time</option></select><small>Dates shown when you open My dashboard.</small></label>
    <label className="field"><span>Table spacing</span><select name="tableDensity" defaultValue={preferences.tableDensity}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select><small>Applies to records and analysis tables.</small></label>
    </div>{error&&<p className="form-error" role="alert">{error}</p>}{message&&<p className="profile-success" role="status">{message}</p>}<div className="form-actions"><button className="primary-button"><Save size={16}/>Save preferences</button></div></form></section>;
}

function ProfileSummary({profile,onEdit,message}:{profile:PersonProfile;onEdit:()=>void;message:string}) {
  const details=[['Sign-in email',profile.email],['Phone number',profile.phone],['City',profile.city],['Job title',profile.job_title],['Portal access',roleNames[profile.role]]];
  return <section className="panel profile-summary" aria-label="My profile"><div className="panel-heading"><div><h2>My profile</h2><p>Your saved details. Your administrator can view this profile.</p></div><button type="button" className="secondary-button" onClick={onEdit}><Pencil size={16}/>Edit profile</button></div>
    <div className="profile-summary-person"><ProfileAvatar large person={profile}/><div><h3>{profile.name}</h3><p>{profile.job_title||roleNames[profile.role]}</p></div></div>
    <dl className="profile-summary-details">{details.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'Not added'}</dd></div>)}<div className="profile-summary-bio"><dt>About me</dt><dd>{profile.bio||'Not added'}</dd></div></dl>
    {message&&<p className="profile-summary-success" role="status">{message}</p>}
  </section>;
}

export default function AccountSettings({profile,error,onRetry,demo,onSaved,preferences,onSavePreferences}:{profile:PersonProfile|null;error:string;onRetry:()=>void;demo:boolean;onSaved:(profile:PersonProfile)=>Promise<void>;preferences:WorkspacePreferences;onSavePreferences:(preferences:WorkspacePreferences)=>void}) {
  const [editing,setEditing]=useState(false),[message,setMessage]=useState('');
  async function saved(next:PersonProfile){await onSaved(next);setEditing(false);setMessage('Profile saved.');}
  return <div className="account-settings">{error?<div className="error-banner" role="alert">{error}<button onClick={onRetry}>Retry</button></div>:profile?(editing?<ProfileEditor profile={profile} demo={demo} onSaved={saved} onCancel={()=>setEditing(false)}/>:<ProfileSummary profile={profile} message={message} onEdit={()=>{setMessage('');setEditing(true)}}/>):<p role="status">Loading your profile…</p>}
    <AppearancePreference/>
    <PreferencesEditor preferences={preferences} onSave={onSavePreferences}/>
    <section className="panel settings-security"><div><h2>Account security</h2><p>Update the password you use to sign in.</p></div><a className="secondary-button" href="/account"><LockKeyhole size={17}/>Change password</a></section>
  </div>;
}
