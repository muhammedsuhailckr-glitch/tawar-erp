import type {Bill} from '@/lib/bills';
import {money} from '@/lib/cashbook';
import {dateLabel} from './ui';

export default function BillDocument({bill}:{bill:Bill}) {
 return <article className="bill-sheet" aria-label={bill.kind==='receipt'?'Payment receipt':'Bill'}>
  <header className="bill-heading"><div><img src="/brand/wordmark-primary.png" alt="Tawar Homes"/><p>tawarhomes@gmail.com</p></div><div className="bill-heading-number"><span>{bill.kind==='receipt'?'Payment receipt':'Bill'}</span><strong>{bill.number}</strong><p>{dateLabel(bill.date)}</p></div></header>
  {bill.voided_at&&<div className="bill-void-stamp">CANCELLED · {bill.void_reason}</div>}
  <section className="bill-customer"><span>{bill.kind==='receipt'?'Received from':'Bill to'}</span><h2>{bill.customer_name}</h2>{bill.customer_address&&<p>{bill.customer_address}</p>}{bill.customer_phone&&<p>{bill.customer_phone}</p>}</section>
  <table className="bill-lines"><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>{bill.items.map((item,i)=><tr key={i}><td>{item.description}</td><td>{item.quantity}</td><td>{money(item.rate)}</td><td>{money(item.amount)}</td></tr>)}</tbody></table>
  <div className="bill-total"><span>{bill.kind==='receipt'?'Amount received':'Total'}</span><strong>{money(bill.total)}</strong></div>
  {bill.payment_ref&&<section className="bill-note"><h3>Payment reference</h3><p>{bill.payment_ref}</p></section>}
  {bill.notes&&<section className="bill-note"><h3>Notes</h3><p>{bill.notes}</p></section>}
  <footer className="bill-signature"><div><span>Issued by</span><strong>{bill.created_name}</strong></div><div><strong>For Tawar Homes</strong><span>Authorised signatory</span></div></footer>
 </article>;
}
