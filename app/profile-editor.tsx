'use client';
import {useEffect,useRef,useState} from 'react';
import {Camera,Save,UserRound} from 'lucide-react';
import {roleNames} from '@/lib/cashbook';
import {type PersonProfile} from '@/lib/profile';
import {ProfileAvatar} from './dashboard-parts';

async function preparePhoto(file:File) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG or WebP photo.');
  if(file.size>10*1024*1024)throw new Error('Choose a photo smaller than 10 MB.');
  const bitmap=await createImageBitmap(file);
  try {
    const scale=Math.min(1,512/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const context=canvas.getContext('2d');if(!context)throw new Error('Photo processing is unavailable. Try another browser.');
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Could not prepare this photo.')),'image/jpeg',0.85));
    if(blob.size>512*1024)throw new Error('Choose a smaller photo.');
    return new File([blob],'profile.jpg',{type:'image/jpeg'});
  } finally {bitmap.close();}
}

export default function ProfileEditor({profile,demo,onSaved,onCancel}:{profile:PersonProfile;demo:boolean;onCancel:()=>void;onSaved:(profile:PersonProfile)=>Promise<void>}) {
  const [photo,setPhoto]=useState<File|null>(null),[preview,setPreview]=useState(''),[remove,setRemove]=useState(false),[busy,setBusy]=useState(false),[processing,setProcessing]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const locked=useRef(false),photoVersion=useRef(0),previewUrl=useRef('');
  function clearPhoto(){if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);previewUrl.current='';setPreview('');setPhoto(null);}
  useEffect(()=>()=>{photoVersion.current++;if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);},[]);
  async function choose(file:File|undefined){if(!file)return;const version=++photoVersion.current;setProcessing(true);setError('');try{const ready=await preparePhoto(file);if(version===photoVersion.current){clearPhoto();previewUrl.current=URL.createObjectURL(ready);setPreview(previewUrl.current);setPhoto(ready);setRemove(false);}}catch(e){if(version===photoVersion.current)setError((e as Error).message);}finally{if(version===photoVersion.current)setProcessing(false);}}
  async function save(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(locked.current||processing)return;if(demo){setError('Open your live workspace to save your profile.');return;}locked.current=true;setBusy(true);setError('');setMessage('');
    try{const data=new FormData(event.currentTarget);data.set('revision',String(profile.revision));data.set('remove_photo',String(remove));if(photo)data.set('photo',photo);
      const response=await fetch('/api/profile',{method:'POST',body:data});const result=await response.json() as {profile:PersonProfile;error?:string};if(!response.ok)throw new Error(result.error||'Could not save your profile.');
      await onSaved(result.profile);clearPhoto();setRemove(false);setMessage('Profile saved.');
    }catch(e){setError((e as Error).message);}finally{locked.current=false;setBusy(false);}
  }
  return <section className="panel profile-editor"><div className="panel-heading"><div><h2>Edit profile</h2><p>Your administrator can view these details.</p></div><UserRound size={20}/></div><form onSubmit={save}>
    <div className="profile-photo-editor"><ProfileAvatar large person={{...profile,photo_url:remove?null:preview||profile.photo_url}}/><div><label className="secondary-button photo-picker"><Camera size={16}/>{processing?'Preparing photo…':'Choose photo'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||processing} onChange={event=>{void choose(event.target.files?.[0]);event.target.value='';}}/></label><small>JPG, PNG or WebP · up to 10 MB<br/>Photos are resized before uploading.</small>{(photo||profile.photo_url)&&!remove&&<button type="button" className="text-button" disabled={busy||processing} onClick={()=>{setRemove(true);clearPhoto();}}>Remove photo</button>}</div></div>
    <div className="profile-form-grid"><label className="field"><span>Full name *</span><input name="name" defaultValue={profile.name} maxLength={100} required disabled={busy}/></label><label className="field"><span>Sign-in email</span><input value={profile.email} readOnly/></label><label className="field"><span>Phone number</span><input name="phone" type="tel" defaultValue={profile.phone} maxLength={30} disabled={busy}/></label><label className="field"><span>City</span><input name="city" defaultValue={profile.city} maxLength={100} disabled={busy}/></label><label className="field"><span>Job title</span><input name="job_title" defaultValue={profile.job_title} maxLength={100} disabled={busy}/></label><label className="field"><span>Portal access</span><input value={roleNames[profile.role]} readOnly/></label><label className="field profile-bio"><span>About me</span><textarea name="bio" defaultValue={profile.bio} maxLength={500} rows={3} disabled={busy}/></label></div>
    {error&&<p className="form-error" role="alert">{error}</p>}{message&&<p className="profile-success" role="status">{message}</p>}<div className="form-actions"><button type="button" className="secondary-button" onClick={onCancel} disabled={busy||processing}>Cancel</button><button className="primary-button" disabled={busy||processing}><Save size={16}/>{busy?'Saving…':'Save profile'}</button></div>
  </form></section>;
}

