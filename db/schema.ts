import { sqliteTable, text, integer, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const projects = sqliteTable('projects', {
 id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull(),location:text('location').notNull().default(''),createdAt:text('created_at').notNull(),profitBps:integer('profit_bps'),contractValue:integer('contract_value').notNull().default(0),contractValueConfirmed:integer('contract_value_confirmed').notNull().default(0),lastEventId:text('last_event_id'),
},t=>[uniqueIndex('projects_owner_name').on(t.owner,t.name)]);
export const transactions = sqliteTable('transactions', {
 id:text('id').primaryKey(),owner:text('owner').notNull(),type:text('type').notNull(),amount:integer('amount').notNull(),date:text('date').notNull(),description:text('description').notNull(),party:text('party').notNull(),projectId:text('project_id'),category:text('category').notNull(),receiptKey:text('receipt_key'),receiptName:text('receipt_name'),receiptType:text('receipt_type'),createdAt:text('created_at').notNull(),voidedAt:text('voided_at'),voidReason:text('void_reason'),
 account:text('account').notNull().default('legacy'),status:text('status').notNull().default('approved'),createdBy:text('created_by'),createdName:text('created_name').notNull().default('Owner (legacy)'),verifiedBy:text('verified_by'),verifiedName:text('verified_name'),verifiedAt:text('verified_at'),approvedBy:text('approved_by'),approvedName:text('approved_name'),approvedAt:text('approved_at'),reviewNote:text('review_note').notNull().default(''),revision:integer('revision').notNull().default(0),lastEventId:text('last_event_id'),companyShare:integer('company_share').notNull().default(0),profitBpsSnapshot:integer('profit_bps_snapshot'),isFirstPayment:integer('is_first_payment').notNull().default(0),employeeId:text('employee_id'),salaryMonth:text('salary_month'),basePay:integer('base_pay').notNull().default(0),allowance:integer('allowance').notNull().default(0),deduction:integer('deduction').notNull().default(0),paymentRef:text('payment_ref').notNull().default(''),
},t=>[index('transactions_owner_date').on(t.owner,t.date),uniqueIndex('one_active_first_payment').on(t.owner,t.projectId).where(sql`${t.isFirstPayment}=1 AND ${t.voidedAt} IS NULL`),uniqueIndex('one_active_salary_per_month').on(t.owner,t.employeeId,t.salaryMonth).where(sql`${t.employeeId} IS NOT NULL AND ${t.category}='Salary' AND ${t.voidedAt} IS NULL`)]);
export const members=sqliteTable('team_members',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull(),email:text('email').notNull(),userId:text('user_id'),role:text('role').notNull(),active:integer('active').notNull().default(1),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('members_owner_email').on(t.owner,t.email),uniqueIndex('members_owner_user').on(t.owner,t.userId)]);
export const assignments=sqliteTable('project_members',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),memberId:text('member_id').notNull(),projectId:text('project_id').notNull(),
},t=>[uniqueIndex('project_member_pair').on(t.memberId,t.projectId)]);
export const employees=sqliteTable('employees',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),name:text('name').notNull(),jobTitle:text('job_title').notNull(),department:text('department').notNull().default('Office'),phone:text('phone').notNull().default(''),email:text('email').notNull().default(''),employmentType:text('employment_type').notNull().default('Permanent'),joinedOn:text('joined_on').notNull(),monthlySalary:integer('monthly_salary').notNull().default(0),memberId:text('member_id'),active:integer('active').notNull().default(1),createdAt:text('created_at').notNull(),
},t=>[index('employees_owner').on(t.owner),uniqueIndex('employees_member').on(t.owner,t.memberId)]);
export const attendance=sqliteTable('attendance',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),employeeId:text('employee_id').notNull(),date:text('date').notNull(),status:text('status').notNull(),note:text('note').notNull().default(''),updatedBy:text('updated_by').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('attendance_employee_date').on(t.employeeId,t.date),index('attendance_owner_date').on(t.owner,t.date)]);
export const leaveRequests=sqliteTable('leave_requests',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),employeeId:text('employee_id').notNull(),startDate:text('start_date').notNull(),endDate:text('end_date').notNull(),type:text('type').notNull(),reason:text('reason').notNull(),status:text('status').notNull().default('pending'),createdBy:text('created_by').notNull(),createdAt:text('created_at').notNull(),reviewedBy:text('reviewed_by'),reviewedAt:text('reviewed_at'),lastEventId:text('last_event_id'),reviewNote:text('review_note').notNull().default(''),
},t=>[index('leave_owner_employee').on(t.owner,t.employeeId)]);
export const auditEvents=sqliteTable('audit_events',{
 id:text('id').primaryKey(),owner:text('owner').notNull(),entityId:text('entity_id').notNull(),action:text('action').notNull(),actorId:text('actor_id').notNull(),actorName:text('actor_name').notNull(),at:text('at').notNull(),note:text('note').notNull().default(''),details:text('details').notNull().default('{}'),
},t=>[index('audit_owner_entity').on(t.owner,t.entityId)]);
export const authUsers=sqliteTable('auth_users',{
 id:text('id').primaryKey(),email:text('email').notNull(),name:text('name').notNull(),passwordHash:text('password_hash').notNull(),isAdmin:integer('is_admin').notNull().default(0),active:integer('active').notNull().default(1),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('auth_email').on(t.email),uniqueIndex('one_administrator').on(t.isAdmin).where(sql`${t.isAdmin}=1`)]);
export const authSessions=sqliteTable('auth_sessions',{
 tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull(),expiresAt:integer('expires_at').notNull(),createdAt:integer('created_at').notNull(),
},t=>[index('auth_session_user').on(t.userId),index('auth_session_expiry').on(t.expiresAt)]);
export const authThrottles=sqliteTable('auth_throttles',{
 id:text('id').primaryKey(),attempts:integer('attempts').notNull(),expiresAt:integer('expires_at').notNull(),
},t=>[index('auth_throttle_expiry').on(t.expiresAt)]);
export const receiptFiles=sqliteTable('receipt_files',{
 key:text('key').primaryKey(),size:integer('size').notNull(),contentType:text('content_type').notNull(),chunkCount:integer('chunk_count').notNull(),createdAt:text('created_at').notNull(),
});
export const receiptChunks=sqliteTable('receipt_chunks',{
 receiptKey:text('receipt_key').notNull().references(()=>receiptFiles.key,{onDelete:'cascade'}),part:integer('part').notNull(),data:text('data').notNull(),
},t=>[primaryKey({columns:[t.receiptKey,t.part]})]);
export const userProfiles=sqliteTable('user_profiles',{
 userId:text('user_id').primaryKey().references(()=>authUsers.id,{onDelete:'cascade'}),owner:text('owner').notNull(),phone:text('phone').notNull().default(''),city:text('city').notNull().default(''),jobTitle:text('job_title').notNull().default(''),bio:text('bio').notNull().default(''),photoData:text('photo_data'),photoType:text('photo_type'),revision:integer('revision').notNull().default(0),lastEventId:text('last_event_id').notNull(),updatedAt:text('updated_at').notNull(),
});

export const bills=sqliteTable('bills',{
 sequence:integer('sequence').primaryKey({autoIncrement:true}),id:text('id').notNull().unique(),owner:text('owner').notNull(),kind:text('kind').notNull(),date:text('date').notNull(),customerName:text('customer_name').notNull(),customerAddress:text('customer_address').notNull().default(''),customerPhone:text('customer_phone').notNull().default(''),itemsJson:text('items_json').notNull(),total:integer('total').notNull(),notes:text('notes').notNull().default(''),paymentRef:text('payment_ref').notNull().default(''),sourceTransactionId:text('source_transaction_id'),sourceRevision:integer('source_revision'),createdBy:text('created_by').notNull(),createdName:text('created_name').notNull(),createdAt:text('created_at').notNull(),voidedAt:text('voided_at'),voidReason:text('void_reason').notNull().default(''),revision:integer('revision').notNull().default(0),
},t=>[index('bills_owner_created').on(t.owner,t.createdAt),uniqueIndex('bills_active_receipt').on(t.owner,t.sourceTransactionId).where(sql`${t.sourceTransactionId} IS NOT NULL AND ${t.voidedAt} IS NULL`)]);
