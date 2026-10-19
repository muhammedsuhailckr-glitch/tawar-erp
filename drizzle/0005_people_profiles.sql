CREATE TABLE `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`job_title` text DEFAULT '' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`photo_data` text,
	`photo_type` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`last_event_id` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
