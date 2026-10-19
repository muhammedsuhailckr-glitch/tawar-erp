import {actor,db,fail,AppError,COMPANY_OWNER,canProject} from '@/lib/server';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{
 const a=await actor(request,false,true);if(!['admin','client'].includes(a.role))throw new AppError('Client reports are available to clients and administrators.',403);
 const selected=new URL(request.url).searchParams.get('project_id');if(selected)canProject(a,selected);
 const ids=selected?[selected]:a.projects;
 const scoped=a.role==='client'||!!selected;
 const marks=ids.map(()=>'?').join(',')||'NULL';
 const projects=await db().prepare(`SELECT id,name,location,CASE WHEN contract_value_confirmed=1 AND contract_value>0 THEN contract_value ELSE NULL END AS contract_value FROM projects WHERE owner=?${scoped?` AND id IN (${marks})`:''} ORDER BY name`).bind(COMPANY_OWNER,...(scoped?ids:[])).all();
 const entries=await db().prepare(`SELECT id,project_id,type,date,description,category,amount FROM transactions WHERE owner=? AND account!='company' AND project_id IN (SELECT id FROM projects WHERE owner=?${scoped?` AND id IN (${marks})`:''}) AND voided_at IS NULL AND type IN ('income','expense') ORDER BY date,id`).bind(COMPANY_OWNER,COMPANY_OWNER,...(scoped?ids:[])).all();
 return Response.json({projects:projects.results,entries:entries.results},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return fail(e)}}
