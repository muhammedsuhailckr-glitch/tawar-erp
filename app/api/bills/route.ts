import {jsonObject} from '@/lib/request';
import {billItem,billNumber,type Bill,type BillSource} from '@/lib/bills';
import {actor,db,fail,AppError,uuid,textField,optional,validDate,COMPANY_OWNER,transactionFor,type Actor} from '@/lib/server';
export const dynamic='force-dynamic';
function authority(a:Actor){if(a.role!=='admin'&&a.role!=='manager')throw new AppError('Only administrators and project managers can create and view bills.',403);}
function scope(a:Actor){return {sql:a.role==='admin'?'b.owner=?':'b.owner=? AND b.created_by=?',args:a.role==='admin'?[COMPANY_OWNER]:[COMPANY_OWNER,a.id]};}
const columns=`b.*,t.revision AS current_revision,t.voided_at AS source_voided,t.id AS source_exists`;
const tables=`FROM bills b LEFT JOIN transactions t ON t.id=b.source_transaction_id AND t.owner=b.owner`;
function display(row:any):Bill {
 const {sequence,owner,items_json,current_revision,source_voided,source_exists,...data}=row;
 return {...data,number:billNumber(sequence,row.kind),items:JSON.parse(items_json),source_state:!row.source_transaction_id?null:!source_exists||source_voided?'deleted':current_revision!==row.source_revision?'changed':'current'};
}
async function find(a:Actor,id:string){const s=scope(a);const row=await db().prepare(`SELECT ${columns} ${tables} WHERE ${s.sql} AND b.id=?`).bind(...s.args,id).first<any>();if(!row)throw new AppError('Bill not found or access is not available.',404);return display(row);}
function sourceData(t:any):BillSource{return {id:t.id,revision:t.revision,date:t.date,party:t.party,description:t.description,amount:t.amount,payment_ref:t.payment_ref||''};}
export async function GET(request:Request){try{
 const a=await actor(request);authority(a);const params=new URL(request.url).searchParams;
 if(params.has('id'))return Response.json({bill:await find(a,uuid(params.get('id')))},{headers:{'Cache-Control':'private, no-store'}});
 if(params.has('source_id')){
  const t=await transactionFor(a,uuid(params.get('source_id')));
  if(t.type!=='income'||t.voided_at)throw new AppError('Choose an active cash received entry.');
  // A receipt can be re-used for the same entry; never issue a second active receipt for it.
  const existing=await db().prepare(`SELECT ${columns} ${tables} WHERE b.owner=? AND b.source_transaction_id=? AND b.voided_at IS NULL`).bind(COMPANY_OWNER,t.id).first<any>();
  if(existing&&a.role!=='admin'&&existing.created_by!==a.id)throw new AppError('A receipt has already been issued for this entry. Ask its creator or the administrator to open it.',409);
  return Response.json({source:sourceData(t),bill:existing?display(existing):null},{headers:{'Cache-Control':'private, no-store'}});
 }
 const s=scope(a),rows=await db().prepare(`SELECT ${columns} ${tables} WHERE ${s.sql} ORDER BY b.sequence DESC`).bind(...s.args).all();
 return Response.json({bills:rows.results.map(display)},{headers:{'Cache-Control':'private, no-store'}});
}catch(error){return fail(error);}}
export async function POST(request:Request){try{
 const a=await actor(request,true);authority(a);
 if(Number(request.headers.get('content-length')||0)>50000)throw new AppError('This bill is too large.');
 const data=await jsonObject(request) as any,id=uuid(data.id);
 const duplicate=await db().prepare('SELECT id FROM bills WHERE id=? AND owner=? AND created_by=?').bind(id,COMPANY_OWNER,a.id).first();
 if(duplicate)return Response.json({bill:await find(a,id),already_saved:true});
 const source=data.source_transaction_id?await transactionFor(a,uuid(data.source_transaction_id)):null;
 if(source&&(source.type!=='income'||source.voided_at))throw new AppError('Choose an active cash received entry.');
 if(source&&(!Number.isInteger(data.source_revision)||data.source_revision!==source.revision))throw new AppError('This cash entry changed. Close and reopen the receipt before issuing it.',409);
 const kind=source?'receipt':'bill',date=source?source.date:validDate(data.date,true),customer=source?source.party:textField(data.customer_name,'Customer name',150);
 let items;
 if(source)items=[{description:source.description,quantity:'1',rate:source.amount,amount:source.amount}];
 else{
  if(!Array.isArray(data.items)||!data.items.length||data.items.length>50)throw new AppError('Add between 1 and 50 bill items.');
  try{items=data.items.map((item:any)=>billItem(item?.description,item?.quantity,item?.rate));}catch(error){throw new AppError((error as Error).message);}
 }
 const total=items.reduce((sum:number,item:any)=>sum+item.amount,0);if(!Number.isSafeInteger(total)||total<=0||total>100000000000)throw new AppError('The bill total must be positive and at most ₹100 crore.');
 const address=optional(data.customer_address,500),phone=optional(data.customer_phone,40),notes=optional(data.notes,2000),paymentRef=source?source.payment_ref||'':optional(data.payment_ref,120),now=new Date().toISOString();
 try{
  const result=await db().prepare(`INSERT INTO bills (id,owner,kind,date,customer_name,customer_address,customer_phone,items_json,total,notes,payment_ref,source_transaction_id,source_revision,created_by,created_name,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ? IS NULL OR EXISTS (SELECT 1 FROM transactions WHERE id=? AND owner=? AND revision=? AND type='income' AND voided_at IS NULL) ON CONFLICT(id) DO NOTHING`)
   .bind(id,COMPANY_OWNER,kind,date,customer,address,phone,JSON.stringify(items),total,notes,paymentRef,source?.id||null,source?.revision??null,a.id,a.name,now,source?.id||null,source?.id||null,COMPANY_OWNER,source?.revision??null).run();
  if(!result.meta.changes){const existing=await db().prepare('SELECT id FROM bills WHERE id=? AND owner=? AND created_by=?').bind(id,COMPANY_OWNER,a.id).first();if(!existing)throw new AppError('This receipt changed or was already issued. Refresh before trying again.',409);}
 }catch(error){if(String(error).includes('UNIQUE'))throw new AppError('A receipt already exists for this cash entry. Open it from Bills.',409);throw error;}
 return Response.json({bill:await find(a,id)});
}catch(error){return fail(error);}}
export async function PATCH(request:Request){try{
 const a=await actor(request,true);authority(a);const data=await jsonObject(request) as any,id=uuid(data.id),bill=await find(a,id);
 if(data.action!=='void')throw new AppError('Unknown bill action.');
 if(bill.voided_at)throw new AppError('This bill is already cancelled.',409);
 if(!Number.isInteger(data.revision)||data.revision!==bill.revision)throw new AppError('This bill changed. Refresh before cancelling it.',409);
 const reason=textField(data.reason,'Cancellation reason',300),s=scope(a);
 const result=await db().prepare(`UPDATE bills SET voided_at=?,void_reason=?,revision=revision+1 WHERE id=? AND owner=? AND revision=? AND voided_at IS NULL${a.role==='admin'?'':' AND created_by=?'}`)
  .bind(new Date().toISOString(),reason,id,COMPANY_OWNER,bill.revision,...(a.role==='admin'?[]:[a.id])).run();
 if(!result.meta.changes)throw new AppError('This bill changed. Refresh before cancelling it.',409);
 return Response.json({bill:await find(a,id)});
}catch(error){return fail(error);}}
