import {accountOf,balance,companyBalance,projectBalance,type Book,type Transaction} from './cashbook';

export type DateRange = {from: string; to: string};
export const inRange = (date: string, range: DateRange) => (!range.from || date >= range.from) && (!range.to || date <= range.to);
const sum = (rows: Transaction[]) => rows.reduce((total, row) => total + row.amount, 0);
export const currentRows = (rows: Transaction[]) => rows.filter(row => !row.voided_at);

export function financialAnalysis(book: Book, range: DateRange) {
  const active = currentRows(book.transactions);
  const period = active.filter(row => inRange(row.date, range));
  const throughEnd = active.filter(row => !range.to || row.date <= range.to);
  const beforeStart = range.from ? active.filter(row => row.date < range.from) : [];
  const projects = book.projects.map(project => {
    const rows = period.filter(row => row.project_id === project.id && accountOf(row) === 'project');
    const expenses = rows.filter(row => row.type === 'expense');
    const receivedToDate = sum(throughEnd.filter(row => row.project_id === project.id && row.type === 'income' && accountOf(row) === 'project'));
    return {...project, received: sum(rows.filter(row => row.type === 'income')), spent: sum(expenses),
      receivedToDate, pending: project.contract_value ? Math.max(0,project.contract_value-receivedToDate) : null,
      overpaid: project.contract_value ? Math.max(0,receivedToDate-project.contract_value) : 0,
      allocated: rows.reduce((total,row) => total+row.company_share,0), cash: projectBalance(throughEnd,project.id),
      awaiting: expenses.filter(row => row.status !== 'approved').length, entries: rows.length};
  });
  const income = sum(period.filter(row => row.type === 'income'));
  const expenses = sum(period.filter(row => row.type === 'expense'));
  const categoryTotals = new Map<string,number>();
  for (const row of period.filter(row => row.type === 'expense')) categoryTotals.set(row.category,(categoryTotals.get(row.category)||0)+row.amount);
  const monthly = new Map<string,{month:string;income:number;expenses:number}>();
  for (const row of period) {
    const month = row.date.slice(0,7), entry = monthly.get(month)||{month,income:0,expenses:0};
    if (row.type==='income') entry.income+=row.amount; else entry.expenses+=row.amount;
    monthly.set(month,entry);
  }
  return {period,projects,income,expenses,net:income-expenses,opening:balance(beforeStart),closing:balance(throughEnd),
    companyCash:companyBalance(throughEnd),projectCash:projects.reduce((total,p)=>total+p.cash,0),
    contractValue:projects.reduce((total,p)=>total+p.contract_value,0),pending:projects.reduce((total,p)=>total+(p.pending||0),0),
    unsetValues:projects.filter(p=>!p.contract_value).length,allocations:period.reduce((total,row)=>total+row.company_share,0),
    companySpending:sum(period.filter(row=>accountOf(row)==='company'&&row.type==='expense')),
    categories:[...categoryTotals].map(([name,amount])=>({name,amount})).sort((a,b)=>b.amount-a.amount),
    monthly:[...monthly.values()].sort((a,b)=>a.month.localeCompare(b.month))};
}

export function personAnalysis(book: Book, userId: string | null, memberId: string | null, range: DateRange, employeeId?: string) {
  const employee = book.employees.find(row => employeeId ? row.id===employeeId : !!memberId&&row.member_id===memberId);
  const active = currentRows(book.transactions).filter(row=>inRange(row.date,range));
  const entries = userId ? active.filter(row=>row.created_by===userId&&row.type==='expense'&&row.category!=='Salary').sort((a,b)=>b.date.localeCompare(a.date)||(b.created_at||'').localeCompare(a.created_at||'')) : [];
  const payroll = employee ? currentRows(book.payroll).filter(row=>row.employee_id===employee.id&&inRange(row.date,range)) : [];
  const attendance = employee ? book.attendance.filter(row=>row.employee_id===employee.id&&inRange(row.date,range)) : [];
  const leaves = employee ? book.leaves.filter(row=>row.employee_id===employee.id&&(!range.from||row.end_date>=range.from)&&(!range.to||row.start_date<=range.to)) : [];
  const statuses = (['submitted','verified','approved','returned'] as const).map(status=>({status,count:entries.filter(row=>row.status===status).length,amount:sum(entries.filter(row=>row.status===status))}));
  return {employee,entries,statuses,expenses:sum(entries),paidSalary:sum(payroll),payroll,attendance,leaves,
    checked:userId?active.filter(row=>row.verified_by===userId).length:0,
    approved:userId?active.filter(row=>row.approved_by===userId).length:0,
    present:attendance.filter(row=>row.status==='Present').length,
    halfDays:attendance.filter(row=>row.status==='Half day').length,
    absent:attendance.filter(row=>row.status==='Absent').length,
    leaveDays:attendance.filter(row=>row.status==='Leave').length,
    pendingLeave:leaves.filter(row=>row.status==='pending').length};
}
