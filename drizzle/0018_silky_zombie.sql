ALTER TABLE `application_kits` ADD `canonicalLanguage` varchar(16) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE `application_kits` ADD `canonicalText` text;--> statement-breakpoint
ALTER TABLE `application_kits` ADD `localizedLanguage` varchar(16);--> statement-breakpoint
ALTER TABLE `application_kits` ADD `localizedText` text;--> statement-breakpoint
ALTER TABLE `application_kits` ADD `translationMeta` json;--> statement-breakpoint
ALTER TABLE `job_cards` ADD `countryPackId` enum('VN','PH','US');--> statement-breakpoint
ALTER TABLE `users` ADD `countryPackId` enum('VN','PH','US');--> statement-breakpoint
ALTER TABLE `users` ADD `languageMode` enum('en','vi','bilingual') DEFAULT 'en' NOT NULL;