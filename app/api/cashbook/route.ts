import {canManageTransaction,accountOf} from '@/lib/cashbook';
import {jsonObject,formData} from '@/lib/request';
import {actor,admin,db,bucket,fail,AppError,textField,optional,uuid,validDate,COMPANY_OWNER,projectFor,transactionFor,txAudit,receiptFile} from '@/lib/server';
import {categories,companyCategories,paise} from '@/lib/cashbook';
export const dynamic='force-dynamic';
const safeColumns='id,type,amount,date,description,party,project_id,category,receipt_name,created_at,voided_at,void_reason,account,status,created_by,created_name,verified_by,verified_name,verified_at,approved_by,approved_name,approved_at,review_note,revision,company_share,profit_bps_snapshot,is_first_payment,employee_id,salary_month,base_pay,allowance,deduction,payment_ref';
export async function GET(request:Request){try{
 const a=await actor(request,false,true);if(a.role==='client')return Response.json({user:a,authenticated:true,projects:[],transactions:[],members:[],employees:[],attendance:[],leaves:[],payroll:[],audit:[]},{headers:{'Cache-Control':'no-store'}});const isAdmin=a.role==='admin';const ids=a.projects;const placeholders=ids.map(()=>'?').join(',')||'NULL';
 let where='owner=?',values:any[]=[COMPANY_OWNER];if(!isAdmin){where+=` AND account!='company' AND project_id IN (${placeholders})`;values.push(...ids);if(a.role==='supervisor'){where+=' AND created_by=?';values.push(a.id)}if(a.role==='staff')where+=' AND 0';}
 const tx=await db().prepare(`SELECT ${safeColumns} FROM transactions WHERE ${where} ORDER BY date DESC,created_at DESC,id DESC`).bind(...values).all();
 const ps=await db().prepare(`SELECT * FROM projects WHERE owner=?${isAdmin?'':` AND id IN (${placeholders})`} ORDER BY created_at`).bind(COMPANY_OWNER,...(isAdmin?[]:ids)).all<any>();
 const projects=ps.results.map(p=>(a.role==='supervisor'||a.role==='staff')?{id:p.id,name:p.name,location:p.location,profit_bps:null,contract_value:0}:p);
 const emps=await db().prepare(`SELECT * FROM employees WHERE owner=?${isAdmin?'':' AND member_id=?'}`).bind(COMPANY_OWNER,...(isAdmin?[]:[a.memberId])).all();
 const empScope=isAdmin?'':' AND employee_id IN (SELECT id FROM employees WHERE owner=? AND member_id=?)';const args=isAdmin?[COMPANY_OWNER]:[COMPANY_OWNER,COMPANY_OWNER,a.memberId];
 const [at,lv,pay]=await db().batch([db().prepare(`SELECT * FROM attendance WHERE owner=?${empScope} ORDER BY date DESC`).bind(...args),db().prepare(`SELECT * FROM leave_requests WHERE owner=?${empScope} ORDER BY created_at DESC`).bind(...args),db().prepare(`SELECT ${safeColumns} FROM transactions WHERE owner=? AND category='Salary' AND employee_id IS NOT NULL${empScope} ORDER BY date DESC`).bind(...args)]);
 let members:any[]=[];if(isAdmin){const [ms,assign]=await db().batch([db().prepare('SELECT m.*,p.revision AS profile_revision,CASE WHEN p.photo_data IS NULL THEN 0 ELSE 1 END AS has_photo FROM team_members m LEFT JOIN user_profiles p ON p.user_id=m.user_id AND p.owner=m.owner WHERE m.owner=? ORDER BY m.name').bind(COMPANY_OWNER),db().prepare('SELECT * FROM project_members WHERE owner=?').bind(COMPANY_OWNER)]);members=ms.results.map((m:any)=>({...m,photo_url:m.has_photo?`/api/profile-photo?user_id=${encodeURIComponent(m.user_id)}&v=${m.profile_revision}`:null,project_ids:assign.results.filter((x:any)=>x.member_id===m.id).map((x:any)=>x.project_id)}))}
 const events=isAdmin?await db().prepare('SELECT * FROM audit_events WHERE owner=? ORDER BY at DESC LIMIT 300').bind(COMPANY_OWNER).all():await db().prepare(`SELECT e.* FROM audit_events e JOIN transactions t ON t.id=e.entity_id WHERE e.owner=? AND t.owner=? AND t.account!='company' AND t.project_id IN (${placeholders})${a.role==='supervisor'?' AND t.created_by=?':a.role==='staff'?' AND 0':''} ORDER BY e.at DESC LIMIT 200`).bind(COMPANY_OWNER,COMPANY_OWNER,...ids,...(a.role==='supervisor'?[a.id]:[])).all();
 return Response.json({user:a,authenticated:true,projects,transactions:tx.results,members,employees:emps.results,attendance:at.results,leaves:lv.results,payroll:pay.results,audit:events.results},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return fail(e)}}
export async function POST(request:Request){let uploaded:Awaited<ReturnType<typeof receiptFile>>=null;try{
 const a=await actor(request,true);if(Number(request.headers.get('content-length')||0)>6000000)throw new AppError('Receipt must be 5 MB or smaller.');const f=await formData(request),action=f.get('action');
 if(action!=='transaction'&&action!=='resubmit'&&action!=='edit')throw new AppError('Unknown action.');
 const id=uuid(f.get('id')),resubmit=action==='resubmit',editing=resubmit||action==='edit';let prior:any=null;
 if(editing){
  prior=await transactionFor(a,id);
  if(prior.voided_at)throw new AppError('Deleted entries cannot be edited.',409);
  if(!canManageTransaction(a,prior))throw new AppError('Only the creator or administrator can edit this entry.',403);
  if(prior.employee_id&&prior.category==='Salary')throw new AppError('Use the salary form to edit this payment.');
  if(resubmit&&(prior.type!=='expense'||accountOf(prior)!=='project'||prior.status!=='returned'))throw new AppError('Only returned project expenses can be resubmitted.');
  const revision=f.get('revision');if(typeof revision!=='string'||!/^\d+$/.test(revision)||Number(revision)!==prior.revision)throw new AppError('This entry changed. Close and reopen it before editing.',409);
 }
 else{const duplicate=await db().prepare('SELECT id,created_by FROM transactions WHERE id=? AND owner=?').bind(id,COMPANY_OWNER).first<any>();if(duplicate){if(a.role!=='admin'&&duplicate.created_by!==a.id)throw new AppError('Entry ID is already in use.',409);return Response.json({id,already_saved:true})}}
 const type=String(f.get('type'));if(!['income','expense'].includes(type))throw new AppError('Choose income or expense.');const account=String(f.get('account'));if(!['company','project'].includes(account))throw new AppError('Choose company or project account.');
 if(!editing&&(type==='income'||account==='company'))admin(a);else if(!editing&&!['admin','supervisor'].includes(a.role))throw new AppError('Project petty cash is entered by the supervisor.',403);
 const amount=paise(String(f.get('amount'))),date=validDate(f.get('date')),description=textField(f.get('description'),'Description'),party=textField(f.get('party'),type==='income'?'Received from':'Paid to',100),project=account==='project'?String(f.get('project_id')||''):null;
 const p=project?await projectFor(a,project):null;if(account==='project'&&!p)throw new AppError('Choose a project.');
 if(editing&&(project!==prior.project_id||account!==accountOf(prior)||type!==prior.type))throw new AppError('Keep the original entry type, account and project when editing.');
 if(!editing&&type==='income'&&p&&p.profit_bps===null)throw new AppError('Set this project’s advance-profit percentage before recording a client payment.');
 const category=type==='income'?(p?'Client payment':'Company cash received'):String(f.get('category'));
 if(type==='expense'&&!(account==='company'?companyCategories:categories).includes(category))throw new AppError('Choose a valid expense category.');
 const paymentRef=optional(f.get('payment_ref'),120),event=crypto.randomUUID(),now=new Date().toISOString();uploaded=await receiptFile(f.get('receipt'));
 if(editing){
  const nextStatus=type==='expense'&&account==='project'?'submitted':prior.status;
  const share=prior.is_first_payment?Math.floor((amount*(prior.profit_bps_snapshot||0)+5000)/10000):prior.company_share;
  const previous={amount:prior.amount,date:prior.date,description:prior.description,party:prior.party,category:prior.category,receipt:prior.receipt_name,payment_ref:prior.payment_ref,status:prior.status,company_share:prior.company_share};
  const current={amount,date,description,party,category,receipt:uploaded?.name||prior.receipt_name,payment_ref:paymentRef,status:nextStatus,company_share:share};
  const results=await db().batch([db().prepare(`UPDATE transactions SET amount=?,date=?,description=?,party=?,category=?,receipt_key=?,receipt_name=?,receipt_type=?,payment_ref=?,status=?,company_share=?,verified_by=NULL,verified_name=NULL,verified_at=NULL,approved_by=NULL,approved_name=NULL,approved_at=NULL,review_note='',revision=revision+1,last_event_id=? WHERE id=? AND owner=? AND revision=? AND voided_at IS NULL`).bind(amount,date,description,party,category,uploaded?.key||prior.receipt_key,uploaded?.name||prior.receipt_name,uploaded?.type||prior.receipt_type,paymentRef,nextStatus,share,event,id,COMPANY_OWNER,prior.revision),txAudit(a,event,id,resubmit?'resubmitted':'edited',resubmit?'Corrected and resubmitted':'Entry edited',{previous,current})]);
  if(!results[0].meta.changes)throw new AppError('This entry changed. Refresh and try again.',409);
  uploaded=null;return Response.json({id});
 }
 const status=type==='expense'&&account==='project'?'submitted':'approved';
 // The first receipt, split, and allocation marker are one atomic SQL insert. Later receipts have no split.
 const first=`?='income' AND ?='project' AND NOT EXISTS (SELECT 1 FROM transactions WHERE owner=? AND project_id=? AND type='income' AND voided_at IS NULL)`;
 const sql=`INSERT INTO transactions (id,owner,type,amount,date,description,party,project_id,category,receipt_key,receipt_name,receipt_type,created_at,account,status,created_by,created_name,payment_ref,last_event_id,company_share,profit_bps_snapshot,is_first_payment) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, CASE WHEN ${first} THEN CAST((? * ? + 5000)/10000 AS INTEGER) ELSE 0 END,CASE WHEN ${first} THEN ? ELSE NULL END,CASE WHEN ${first} THEN 1 ELSE 0 END WHERE ?!='project' OR ?!='income' OR EXISTS (SELECT 1 FROM projects WHERE id=? AND owner=? AND profit_bps=?) ON CONFLICT(id) DO NOTHING`;
 const gate=[type,account,COMPANY_OWNER,project];const results=await db().batch([db().prepare(sql).bind(id,COMPANY_OWNER,type,amount,date,description,party,project,category,uploaded?.key||null,uploaded?.name||null,uploaded?.type||null,now,account,status,a.id,a.name,paymentRef,event,...gate,amount,p?.profit_bps||0,...gate,p?.profit_bps??null,...gate,account,type,project,COMPANY_OWNER,p?.profit_bps??null),txAudit(a,event,id,type==='income'?'cash_received':'expense_recorded','',{amount,account,project_id:project,status})]);
 if(!results[0].meta.changes){const saved=await db().prepare('SELECT id FROM transactions WHERE id=? AND owner=?').bind(id,COMPANY_OWNER).first();if(!saved)throw new AppError('Project settings changed. Reopen this payment to use the latest percentage.',409);if(uploaded)await bucket().delete(uploaded.key)}uploaded=null;return Response.json({id});
 }catch(e){if(uploaded)try{await bucket().delete(uploaded.key)}catch{}return fail(e)}}
export async function PATCH(request:Request){try{
 const a=await actor(request,true),data=await jsonObject(request) as any,id=uuid(data.id),reason=textField(data.reason,'Reason');
 const t=await transactionFor(a,id);
 if(t.voided_at)throw new AppError('This entry is already deleted.',409);
 if(!canManageTransaction(a,t))throw new AppError('Only the creator or administrator can delete this entry.',403);
 if(!Number.isInteger(data.revision)||data.revision!==t.revision)throw new AppError('Entry changed. Refresh before deleting it.',409);
 const event=crypto.randomUUID();const r=await db().batch([db().prepare('UPDATE transactions SET voided_at=?,void_reason=?,revision=revision+1,last_event_id=? WHERE id=? AND owner=? AND voided_at IS NULL AND revision=?').bind(new Date().toISOString(),reason,event,id,COMPANY_OWNER,t.revision),txAudit(a,event,id,'deleted',reason,{amount:t.amount,company_share:t.company_share,first_payment:!!t.is_first_payment,status:t.status})]);
 if(!r[0].meta.changes)throw new AppError('Entry changed. Refresh before deleting it.',409);return Response.json({ok:true});
 }catch(e){return fail(e)}}
