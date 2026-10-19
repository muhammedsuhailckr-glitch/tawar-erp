'use client';
import {useEffect,useState} from 'react';
import {roleNames,type Book} from '@/lib/cashbook';
import type {PersonProfile} from '@/lib/profile';

export function usePersonalProfile(user:Book['user'],demo:boolean) {
  const [result,setResult]=useState<{userId:string;profile:PersonProfile|null;error:string}|null>(null);
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(!user||demo||user.role==='client')return;
    let active=true;
    fetch('/api/profile',{cache:'no-store'}).then(async response=>{
      const data=await response.json() as {profile:PersonProfile;error?:string};
      if(!response.ok)throw new Error(data.error||'Could not load your profile.');
      if(active)setResult(previous=>previous?.userId===user.id&&previous.profile&&previous.profile.revision>data.profile.revision?previous:{userId:user.id,profile:data.profile,error:''});
    }).catch(error=>{if(active)setResult({userId:user.id,profile:null,error:error.message});});
    return()=>{active=false;};
  },[user,demo,attempt]);
  const sample:PersonProfile|null=user&&demo?{user_id:user.id,name:user.name,email:'sample@example.test',role:user.role,active:1,member_id:user.memberId,phone:'',city:'',job_title:roleNames[user.role],bio:'',revision:0,photo_url:null}:null;
  const current=result?.userId===user?.id?result:null;
  return {profile:demo?sample:current?.profile||null,error:demo?'':current?.error||'',
    retry:()=>{setResult(null);setAttempt(value=>value+1);},
    update:(profile:PersonProfile)=>setResult({userId:profile.user_id,profile,error:''})};
}
