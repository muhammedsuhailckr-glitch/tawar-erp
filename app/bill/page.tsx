'use client';
import {useEffect,useState} from 'react';
import {Printer,ArrowLeft} from 'lucide-react';
import type {Bill,BillSource} from '@/lib/bills';
import BillDocument from '../bill-document';
export default function PrintableBill(){
 const [bill,setBill]=useState<Bill|null>(null),[error,setError]=useState('');
 useEffect(()=>{const id=new URLSearchParams(window.location.search).get('id');if(!id){setError('No bill was selected.');return;}let active=true;fetch('/api/bills?id='+encodeURIComponent(id),{cache:'no-store'}).then(async r=>{const data=await r.json() as {bill:Bill;bills:Bill[];source:BillSource;error?:string};if(!r.ok)throw new Error(data.error||'Could not load this bill.');if(active){setBill(data.bill);document.title=data.bill.number+' | Tawar Homes';}}).catch(e=>{if(active)setError(e.message)});return()=>{active=false};},[]);
 const stale=bill?.source_state==='changed'||bill?.source_state==='deleted';
 return <main className="bill-print-page"><div className="bill-print-toolbar"><a className="secondary-button" href="/"><ArrowLeft size={17}/>Workspace</a><button className="primary-button" disabled={!bill||!!stale||!!bill.voided_at} onClick={()=>window.print()}><Printer size={17}/>Print / Save PDF</button></div>{error?<div className="error-banner" role="alert">{error}<a href="/login">Sign in</a></div>:!bill?<p role="status">Loading bill…</p>:<>{stale&&<div className="error-banner">The cash entry has {bill.source_state==='deleted'?'been deleted':'changed'}. Cancel this receipt in Bills and generate a replacement from the current entry.</div>}<BillDocument bill={bill}/></>}</main>;
}
