CREATE TABLE `job_card_personalization_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobCardId` int NOT NULL,
	`userId` int NOT NULL,
	`sourceType` enum('linkedin_post','linkedin_about','company_news','other') NOT NULL DEFAULT 'other',
	`url` varchar(2048),
	`pastedText` text,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_card_personalization_sources_id` PRIMARY KEY(`id`)
);
