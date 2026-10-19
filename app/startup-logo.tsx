'use client';
import {useEffect,useRef,useState} from 'react';
export default function StartupLogo(){
 const image=useRef<HTMLImageElement>(null);
 const[visible,setVisible]=useState(true),[ready,setReady]=useState(false);
 useEffect(()=>{
  // A cached image may finish loading before React attaches its load handler.
  if(image.current?.complete){
   if(image.current.naturalWidth>0)setReady(true);
   else setVisible(false);
  }
  const timeout=setTimeout(()=>setVisible(false),5000);
  return()=>clearTimeout(timeout);
 },[]);
 useEffect(()=>{if(!ready)return;const timeout=setTimeout(()=>setVisible(false),2200);return()=>clearTimeout(timeout);},[ready]);
 if(!visible)return null;
 return <div className={'startup-logo'+(ready?' startup-logo-ready':'')} aria-hidden="true"><img ref={image} src="/brand/wordmark-primary.png" alt="" loading="eager" fetchPriority="high" onLoad={()=>setReady(true)} onError={()=>setVisible(false)}/></div>;
}
