CREATE TABLE `project_members` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`member_id` text NOT NULL,
	`project_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_member_pair` ON `project_members` (`member_id`,`project_id`);--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`employee_id` text NOT NULL,
	`date` text NOT NULL,
	`status` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_employee_date` ON `attendance` (`employee_id`,`date`);--> statement-breakpoint
CREATE INDEX `attendance_owner_date` ON `attendance` (`owner`,`date`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`at` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`details` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_owner_entity` ON `audit_events` (`owner`,`entity_id`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`job_title` text NOT NULL,
	`department` text DEFAULT 'Office' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`employment_type` text DEFAULT 'Permanent' NOT NULL,
	`joined_on` text NOT NULL,
	`monthly_salary` integer DEFAULT 0 NOT NULL,
	`member_id` text,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `employees_owner` ON `employees` (`owner`);--> statement-breakpoint
CREATE UNIQUE INDEX `employees_member` ON `employees` (`owner`,`member_id`);--> statement-breakpoint
CREATE TABLE `leave_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`employee_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`type` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_by` text,
	`reviewed_at` text,
	`review_note` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `leave_owner_employee` ON `leave_requests` (`owner`,`employee_id`);--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_owner_email` ON `team_members` (`owner`,`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `members_owner_user` ON `team_members` (`owner`,`user_id`);--> statement-breakpoint
ALTER TABLE `projects` ADD `profit_bps` integer;--> statement-breakpoint
ALTER TABLE `projects` ADD `contract_value` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `account` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `status` text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `created_name` text DEFAULT 'Owner (legacy)' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `verified_by` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `verified_name` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `verified_at` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `approved_by` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `approved_name` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `approved_at` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `review_note` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `last_event_id` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `company_share` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `profit_bps_snapshot` integer;--> statement-breakpoint
ALTER TABLE `transactions` ADD `is_first_payment` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `employee_id` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `salary_month` text;--> statement-breakpoint
ALTER TABLE `transactions` ADD `base_pay` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `allowance` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `deduction` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `payment_ref` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_first_payment` ON `transactions` (`owner`,`project_id`) WHERE "transactions"."is_first_payment"=1 AND "transactions"."voided_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `one_active_salary_per_month` ON `transactions` (`owner`,`employee_id`,`salary_month`) WHERE "transactions"."employee_id" IS NOT NULL AND "transactions"."category"='Salary' AND "transactions"."voided_at" IS NULL;