import assert from 'node:assert/strict';
import {sql,env,setUser} from './runtime.mjs';
import {receiptStorage} from './receipt-storage.mjs';
import * as cashbook from './route.mjs';
import * as receipt from './receipt.mjs';

let checks=0;
const eq=(actual,expected)=>{assert.deepEqual(actual,expected);checks++};
const store=receiptStorage(env.DB);
const options={httpMetadata:{contentType:'application/pdf'}};
for(const size of [1,256*1024,256*1024+1,5*1024*1024]){
 const key=crypto.randomUUID(),bytes=Uint8Array.from({length:size},(_,i)=>i%251);
 await store.put(key,bytes.buffer,options);
 eq(new Uint8Array((await store.get(key)).body),bytes);
 eq(sql.prepare('SELECT count(*) n FROM receipt_chunks WHERE receipt_key=?').get(key).n,Math.ceil(size/(256*1024)));
 await store.delete(key);
 eq(await store.get(key),null);
 eq(sql.prepare('SELECT count(*) n FROM receipt_chunks WHERE receipt_key=?').get(key).n,0);
}
await assert.rejects(()=>store.put('empty',new ArrayBuffer(0),options));checks++;
await assert.rejects(()=>store.put('oversize',new ArrayBuffer(5*1024*1024+1),options));checks++;
// A batch failure must roll back metadata and every earlier chunk.
sql.exec("CREATE TRIGGER reject_chunk BEFORE INSERT ON receipt_chunks WHEN NEW.part=1 BEGIN SELECT RAISE(ABORT,'Simulated full database'); END");
await assert.rejects(()=>store.put('failed',new ArrayBuffer(300*1024),options));checks++;
eq(sql.prepare("SELECT count(*) n FROM receipt_files WHERE key='failed'").get().n,0);
eq(sql.prepare("SELECT count(*) n FROM receipt_chunks WHERE receipt_key='failed'").get().n,0);
sql.exec('DROP TRIGGER reject_chunk');
await store.put('truncated',new ArrayBuffer(300*1024),options);
sql.exec("DELETE FROM receipt_chunks WHERE receipt_key='truncated' AND part=1");
await assert.rejects(()=>store.get('truncated'),/incomplete/);checks++;
await store.delete('truncated');
// Adding optional R2 later preserves reads of older database receipts.
await store.put('existing',new Uint8Array([1,2,3]).buffer,options);
const withR2=receiptStorage(env.DB,env.BUCKET);
eq(new Uint8Array((await withR2.get('existing')).body),new Uint8Array([1,2,3]));
await withR2.put('new',new Uint8Array([4,5]).buffer,options);
eq(new Uint8Array((await withR2.get('new')).body),new Uint8Array([4,5]));
await withR2.delete('existing');await withR2.delete('new');
eq(await withR2.get('existing'),null);eq(await withR2.get('new'),null);

// Exercise actual upload/download handlers with no R2 binding.
delete env.BUCKET;
setUser('tawar-workspace');
const id=crypto.randomUUID();
async function upload(){
 const form=new FormData();
 for(const [k,v]of Object.entries({action:'transaction',id,type:'expense',account:'company',amount:'12.34',date:'2026-09-20',description:'D1 receipt test',party:'Test supplier',category:'Other overheads'}))form.set(k,v);
 form.set('receipt',new File(['%PDF-1.4 D1 receipt'],'receipt.pdf',{type:'application/pdf'}));
 return cashbook.POST(new Request('https://test.example/api/cashbook',{method:'POST',headers:{Origin:'https://test.example'},body:form}));
}
eq((await upload()).status,200);
eq(sql.prepare('SELECT count(*) n FROM receipt_files').get().n,1);
eq((await upload()).status,200);
eq(sql.prepare('SELECT count(*) n FROM receipt_files').get().n,1);
const request=new Request('https://test.example/api/receipt?id='+id);
const response=await receipt.GET(request);
eq(response.status,200);eq(await response.text(),'%PDF-1.4 D1 receipt');
eq(response.headers.get('Cache-Control'),'private, no-store');
eq(response.headers.get('Content-Security-Policy'),'sandbox');
setUser(null);eq((await receipt.GET(request)).status,401);
eq(sql.prepare('SELECT count(*) n FROM receipt_files').get().n,1);
console.log(JSON.stringify({receipt_assertions_passed:checks,coverage:['D1 binary round trips through 5 MB','atomic writes and failed-write cleanup','incomplete-file rejection','R2 upgrade compatibility','real upload and protected download handlers','duplicate upload cleanup']}));
