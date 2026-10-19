export type BillItem={description:string;quantity:string;rate:number;amount:number};
export type Bill={id:string;number:string;kind:'bill'|'receipt';date:string;customer_name:string;customer_address:string;customer_phone:string;items:BillItem[];total:number;notes:string;payment_ref:string;source_transaction_id:string|null;source_revision:number|null;source_state:'current'|'changed'|'deleted'|null;created_by:string;created_name:string;created_at:string;voided_at:string|null;void_reason:string;revision:number};
export type BillSource={id:string;revision:number;date:string;party:string;description:string;amount:number;payment_ref:string};
export const billNumber=(sequence:number,kind:string)=>`TH-${kind==='receipt'?'R':'B'}-${String(sequence).padStart(6,'0')}`;
export function billItem(description:string,quantity:string,rate:string):BillItem {
 if(typeof description!=='string'||!description.trim()||description.trim().length>300)throw new Error('Each item needs a description of up to 300 characters.');
 if(!/^\d{1,5}(\.\d{1,3})?$/.test(quantity))throw new Error('Enter a quantity with up to 3 decimal places.');
 if(!/^\d{1,10}(\.\d{1,2})?$/.test(rate))throw new Error('Enter a rate with up to 2 decimal places.');
 const [q,qd='']=quantity.split('.'),[r,rd='']=rate.split('.');
 const units=BigInt(q)*BigInt(1000)+BigInt(qd.padEnd(3,'0')),price=BigInt(r)*BigInt(100)+BigInt(rd.padEnd(2,'0'));
 const amount=(units*price+BigInt(500))/BigInt(1000);
 if(units<=BigInt(0)||price<BigInt(0)||price>BigInt(100000000000)||amount>BigInt(100000000000))throw new Error('Use a positive quantity and keep each item at or below ₹100 crore.');
 return {description:description.trim(),quantity:String(Number(quantity)),rate:Number(price),amount:Number(amount)};
}
