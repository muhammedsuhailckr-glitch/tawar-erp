CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_owner_name` ON `projects` (`owner`,`name`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`description` text NOT NULL,
	`party` text NOT NULL,
	`project_id` text,
	`category` text NOT NULL,
	`receipt_key` text,
	`receipt_name` text,
	`receipt_type` text,
	`created_at` text NOT NULL,
	`voided_at` text,
	`void_reason` text
);
--> statement-breakpoint
CREATE INDEX `transactions_owner_date` ON `transactions` (`owner`,`date`);