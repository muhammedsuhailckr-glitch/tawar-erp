import {jsonObject} from '@/lib/request';
import {actor,db,fail,AppError,uuid,optional,textField,COMPANY_OWNER,transactionFor,txAudit} from '@/lib/server';

export async function POST(request:Request) {
  try {
    const a=await actor(request,true), data=await jsonObject(request) as any;
    const id=uuid(data.id), entry=await transactionFor(a,id);
    if(entry.type!=='expense'||!entry.project_id||entry.account==='company'||entry.voided_at)
      throw new AppError('Only active project expenses enter the review workflow.');
    if(!Number.isInteger(data.revision)||data.revision!==entry.revision)
      throw new AppError('This expense changed. Reopen it to review the latest entry.',409);
    const finalAuthority=a.role==='admin'||a.role==='manager';
    if(!finalAuthority&&a.role!=='engineer')throw new AppError('Your portal does not allow this review action.',403);
    if(!finalAuthority&&entry.created_by===a.id)throw new AppError('You cannot check your own expense.',403);
    if(entry.status==='approved')throw new AppError('This expense is already approved. No further review is needed.',409);
    if(!finalAuthority&&entry.status!=='submitted')throw new AppError('This expense is no longer awaiting checking.',409);
    if(!['submitted','verified','returned'].includes(entry.status))throw new AppError('This expense cannot be reviewed.',409);
    const action=data.action, now=new Date().toISOString();
    let next='',extra='',values:any[]=[];
    if(finalAuthority&&action==='approve') {
      next='approved';extra=',approved_by=?,approved_name=?,approved_at=?';values=[a.id,a.name,now];
    } else if(a.role==='engineer'&&action==='verify') {
      next='verified';extra=',verified_by=?,verified_name=?,verified_at=?';values=[a.id,a.name,now];
    } else if(action==='return')next='returned';
    if(!next)throw new AppError('Your portal does not allow this review action.',403);
    const note=action==='return'?textField(data.note,'Reason for return'):optional(data.note),event=crypto.randomUUID();
    const result=await db().batch([
      db().prepare(`UPDATE transactions SET status=?,review_note=?,revision=revision+1,last_event_id=?${extra} WHERE id=? AND owner=? AND status=? AND revision=? AND voided_at IS NULL`)
        .bind(next,note,event,...values,id,COMPANY_OWNER,entry.status,data.revision),
      txAudit(a,event,id,next,note,{from:entry.status,to:next,amount:entry.amount,authority:a.role,engineer_check_waived:next==='approved'&&!entry.verified_by}),
    ]);
    if(!result[0].meta.changes)throw new AppError('Another reviewer updated this entry. Refresh to see its status.',409);
    return Response.json({ok:true,status:next});
  } catch(error) {return fail(error);}
}
