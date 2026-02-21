ALTER TABLE `job_cards` ADD `eligibilityPrecheckStatus` enum('none','recommended','conflict') DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `job_cards` ADD `eligibilityPrecheckRulesJson` text;--> statement-breakpoint
ALTER TABLE `job_cards` ADD `eligibilityPrecheckUpdatedAt` timestamp;