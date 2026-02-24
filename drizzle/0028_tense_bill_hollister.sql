ALTER TABLE `job_cards` MODIFY COLUMN `countryPackId` enum('GLOBAL','CA','VN','PH','US');--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `countryPackId` enum('GLOBAL','CA','VN','PH','US');