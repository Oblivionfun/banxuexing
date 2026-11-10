CREATE TABLE `activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`at` integer NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`summary` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activity_at` ON `activity` (`at`);--> statement-breakpoint
CREATE TABLE `availability` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner_type` text NOT NULL,
	`subject_id` integer,
	`weekday` integer NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `availability_owner` ON `availability` (`owner_type`,`subject_id`);--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`set_id` integer,
	`lesson_id` integer,
	`original_name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`sha256` text NOT NULL,
	`kind` text NOT NULL,
	`width` integer,
	`height` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`set_id`) REFERENCES `material_sets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `files_set` ON `files` (`set_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `files_lesson` ON `files` (`lesson_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `files_sha` ON `files` (`sha256`);--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`subject_id` integer NOT NULL,
	`date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`topic` text DEFAULT '' NOT NULL,
	`summary_md` text DEFAULT '' NOT NULL,
	`homework` text DEFAULT '' NOT NULL,
	`prep` text DEFAULT '' NOT NULL,
	`recording_url` text DEFAULT '' NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`notified_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lessons_date` ON `lessons` (`date`,`start_time`);--> statement-breakpoint
CREATE INDEX `lessons_subject_date` ON `lessons` (`subject_id`,`date`);--> statement-breakpoint
CREATE TABLE `material_sets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`subject_id` integer NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`title` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`notified_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `material_sets_subject` ON `material_sets` (`subject_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`grade` text DEFAULT '' NOT NULL,
	`intro` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`hue` integer NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`teacher_name` text DEFAULT '' NOT NULL,
	`teacher_note` text DEFAULT '' NOT NULL,
	`plan_md` text DEFAULT '' NOT NULL,
	`plan_updated_at` integer,
	`weekly_lessons` integer DEFAULT 1 NOT NULL,
	`lesson_minutes` integer DEFAULT 90 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_student_slug` ON `subjects` (`student_id`,`slug`);