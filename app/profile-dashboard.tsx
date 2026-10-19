'use client';
import {useState} from 'react';
import {type Book,money,roleNames,today} from '@/lib/cashbook';
import type {PersonProfile} from '@/lib/profile';
import {personAnalysis,type DateRange} from '@/lib/analytics';
import {DateFilters,Metric,ProfileAvatar} from './dashboard-parts';
import {Status,dateLabel} from './ui';

export default function ProfileDashboard({book,profile,defaultPeriod}:{book:Book;profile:PersonProfile|null;defaultPeriod:'month'|'all'}) {
  const [range,setRange]=useState<DateRange>(()=>defaultPeriod==='all'?{from:'',to:''}:{from:today().slice(0,7)+'-01',to:today()});
  const user=book.user;if(!user)return null;
  const stats=personAnalysis(book,user.id,user.memberId,range);
  const projects=book.projects.filter(project=>user.role==='admin'||user.projects.includes(project.id));
  return <div className="personal-dashboard"><div className="profile-welcome"><div className="dashboard-person"><ProfileAvatar large person={{name:profile?.name||user.name,photo_url:profile?.photo_url||null}}/><div><span className="eyebrow">MY WORKSPACE</span><h2>Hello, {profile?.name||user.name}</h2><p>Your activity, projects and personal HR summary.</p></div></div><span className="portal-pill">{roleNames[user.role]}</span></div>
    <section className="panel dashboard-section"><div className="panel-heading"><div><h2>My activity</h2><p>Amounts reflect active entries you recorded. Deleted entries are excluded.</p></div></div><DateFilters range={range} onChange={setRange}/>{range.from&&range.to&&range.from>range.to?<p className="form-error">Choose an end date on or after the start date.</p>:<><div className="dashboard-metrics"><Metric label="Expenses entered" value={money(stats.expenses)} note={`${stats.entries.length} entries`}/><Metric label="Entries checked" value={String(stats.checked)} note="Current checks on selected entries"/><Metric label="Entries approved" value={String(stats.approved)} note="Current approvals on selected entries"/><Metric label="Salary paid to me" value={money(stats.paidSalary)} note={stats.employee?`${stats.payroll.length} payments`:'No linked employee record'}/></div><div className="dashboard-status-grid">{stats.statuses.map(row=><div key={row.status}><Status value={row.status}/><strong>{row.count} entries</strong><span>{money(row.amount)}</span></div>)}</div></>}
    </section><div className="dashboard-two-column"><section className="panel dashboard-section"><div className="panel-heading"><div><h2>My projects</h2><p>{projects.length} {user.role==='admin'?'company':'assigned'} projects</p></div></div><div className="dashboard-project-list">{projects.length?projects.map(project=><div key={project.id}><strong>{project.name}</strong><span>{project.location||'Location not set'}</span></div>):<p className="dashboard-muted">No projects assigned to your portal.</p>}</div></section>
    <section className="panel dashboard-section"><div className="panel-heading"><div><h2>My attendance & leave</h2><p>{stats.employee?`${stats.employee.job_title} · joined ${dateLabel(stats.employee.joined_on)}`:'Ask your administrator to link your employee record.'}</p></div></div><div className="dashboard-metrics compact"><Metric label="Present" value={String(stats.present)}/><Metric label="Half days" value={String(stats.halfDays)}/><Metric label="Absent" value={String(stats.absent)}/><Metric label="Pending leave" value={String(stats.pendingLeave)}/></div><p className="dashboard-muted">Based on recorded attendance in the selected dates; missing dates are not counted as absences.</p></section></div>
  </div>;
}
