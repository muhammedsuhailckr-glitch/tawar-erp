export type ClientProject={id:string;name:string;location:string;contract_value:number|null};
export type ClientEntry={id:string;project_id:string;type:'income'|'expense';date:string;description:string;category:string;amount:number};
export type ClientReport={projects:ClientProject[];entries:ClientEntry[]};
export function clientTotals(data:ClientReport,id:string){const project=data.projects.find(p=>p.id===id);const rows=data.entries.filter(t=>t.project_id===id);const received=rows.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);return{received,sharedExpenses:rows.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0),pending:project?.contract_value?Math.max(0,project.contract_value-received):null,credit:project?.contract_value?Math.max(0,received-project.contract_value):0};}
