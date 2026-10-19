'use client';
import {useMemo,useSyncExternalStore} from 'react';

export type WorkspacePreferences={dashboardPeriod:'month'|'all';tableDensity:'comfortable'|'compact'};
const defaults:WorkspacePreferences={dashboardPeriod:'month',tableDensity:'comfortable'};
const changed='tawar-preferences-changed';
function subscribe(callback:()=>void){window.addEventListener('storage',callback);window.addEventListener(changed,callback);return()=>{window.removeEventListener('storage',callback);window.removeEventListener(changed,callback);};}
export function useWorkspacePreferences(userId:string|null) {
  const key=userId?'tawar-workspace-preferences:'+userId:null;
  const raw=useSyncExternalStore(subscribe,()=>{try{return key?localStorage.getItem(key)||'':'';}catch{return '';}},()=>'');
  const value=useMemo(()=>{try{const data=JSON.parse(raw);return {dashboardPeriod:data?.dashboardPeriod==='all'?'all':'month',tableDensity:data?.tableDensity==='compact'?'compact':'comfortable'} as WorkspacePreferences;}catch{return defaults;}},[raw]);
  function save(next:WorkspacePreferences){if(!key)throw new Error('Sign in before saving preferences.');try{localStorage.setItem(key,JSON.stringify(next));window.dispatchEvent(new Event(changed));}catch{throw new Error('Your browser could not save preferences. Allow site storage and try again.');}}
  return {value,save};
}
