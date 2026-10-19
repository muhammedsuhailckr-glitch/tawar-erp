'use client';
import {money} from '@/lib/cashbook';
import type {DateRange} from '@/lib/analytics';
import {initials,type PersonProfile} from '@/lib/profile';

export function ProfileAvatar({person,large=false}:{person:Pick<PersonProfile,'name'|'photo_url'>;large?:boolean}) {
  // Authenticated photos and temporary blob previews must load directly without an image proxy.
  // eslint-disable-next-line @next/next/no-img-element
  return <span className={'profile-avatar'+(large?' profile-avatar-large':'')}>{person.photo_url?<img src={person.photo_url} alt={person.name+' profile photo'}/>:initials(person.name)||'TH'}</span>;
}
export function Metric({label,value,note}:{label:string;value:string;note?:string}) {
  return <div className="dashboard-metric"><span>{label}</span><strong className={value.startsWith('-')||value.startsWith('−')?'negative':''}>{value}</strong>{note&&<small>{note}</small>}</div>;
}
export function DateFilters({range,onChange}:{range:DateRange;onChange:(range:DateRange)=>void}) {
  return <div className="dashboard-date-filter"><label>From<input type="date" aria-label="Analysis from date" value={range.from} max={range.to||undefined} onChange={event=>onChange({...range,from:event.target.value})}/></label><label>To<input type="date" aria-label="Analysis to date" value={range.to} min={range.from||undefined} onChange={event=>onChange({...range,to:event.target.value})}/></label><button className="secondary-button" onClick={()=>onChange({from:'',to:''})}>All time</button><span>{range.from||range.to?'Selected period':'All recorded dates'}</span></div>;
}
export function AmountBars({rows}:{rows:{name:string;amount:number}[]}) {
  const max=Math.max(1,...rows.map(row=>row.amount));
  return <div className="amount-bars">{rows.length?rows.map(row=><div key={row.name}><div><span>{row.name}</span><strong>{money(row.amount)}</strong></div><span className="amount-track"><span style={{width:`${row.amount/max*100}%`}}/></span></div>):<p className="dashboard-muted">No spending recorded for this selection.</p>}</div>;
}
