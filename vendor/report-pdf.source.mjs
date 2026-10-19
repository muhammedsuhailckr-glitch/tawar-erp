import {jsPDF} from 'jspdf';
import autoTable from 'jspdf-autotable';
export function createReportPdf({brand,title,subtitle,summary,columns,rows,note,logo}) {
 const doc=new jsPDF({format:'a4',compress:true});
 const color=brand.color;
 const header=()=>{doc.setFillColor(color);doc.rect(0,0,210,4,'F');if(logo){const props=doc.getImageProperties(logo);const w=Math.min(43,19*props.width/props.height),h=w*props.height/props.width;doc.addImage(logo,'PNG',14,10,w,h);}doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(color);doc.text(brand.name,196,16,{align:'right'});doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(80);doc.text(brand.email,196,22,{align:'right'});doc.text('Generated '+new Date().toISOString().slice(0,10)+' | INR',196,27,{align:'right'});};
 header();doc.setFontSize(18);doc.setTextColor(color);doc.text(title,14,42);doc.setTextColor(85);doc.setFontSize(9);const lines=doc.splitTextToSize(subtitle,182);doc.text(lines,14,49);let y=51+lines.length*4;
 autoTable(doc,{startY:y,body:summary,theme:'plain',styles:{fontSize:9,cellPadding:2.5},columnStyles:{0:{fontStyle:'bold',cellWidth:105},1:{halign:'right'}},margin:{left:14,right:14,top:36,bottom:18}});
 y=doc.lastAutoTable.finalY+7;
 autoTable(doc,{startY:y,head:[columns],body:rows.length?rows:[['No entries in this report',...columns.slice(1).map(()=> '')]],theme:'striped',rowPageBreak:'avoid',headStyles:{fillColor:color,fontSize:8},styles:{fontSize:8,cellPadding:2.4,overflow:'linebreak'},margin:{left:14,right:14,top:36,bottom:20},didDrawPage:()=>{if(doc.getNumberOfPages()>1)header();}});
 y=doc.lastAutoTable.finalY+7;const notes=doc.splitTextToSize(note,182);if(y+notes.length*4>277){doc.addPage();header();y=40;}doc.setFontSize(8);doc.setTextColor(85);doc.text(notes,14,y);
 const count=doc.getNumberOfPages();for(let i=1;i<=count;i++){doc.setPage(i);doc.setDrawColor(225);doc.line(14,283,196,283);doc.setFontSize(8);doc.setTextColor(100);doc.text(brand.name+' | '+title,14,289);doc.text('Page '+i+' of '+count,196,289,{align:'right'});}
 return doc.output('blob');
}
