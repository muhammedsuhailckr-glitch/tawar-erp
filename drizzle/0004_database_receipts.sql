CREATE TABLE `receipt_chunks` (
	`receipt_key` text NOT NULL,
	`part` integer NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`receipt_key`, `part`),
	FOREIGN KEY (`receipt_key`) REFERENCES `receipt_files`(`key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `receipt_files` (
	`key` text PRIMARY KEY NOT NULL,
	`size` integer NOT NULL,
	`content_type` text NOT NULL,
	`chunk_count` integer NOT NULL,
	`created_at` text NOT NULL
);
