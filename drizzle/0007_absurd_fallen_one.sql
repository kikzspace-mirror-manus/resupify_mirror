CREATE TABLE `application_kits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobCardId` int NOT NULL,
	`resumeId` int NOT NULL,
	`evidenceRunId` int NOT NULL,
	`regionCode` varchar(16) NOT NULL,
	`trackCode` varchar(16) NOT NULL,
	`tone` enum('Human','Confident','Warm','Direct') NOT NULL DEFAULT 'Human',
	`topChangesJson` text,
	`bulletRewritesJson` text,
	`coverLetterText` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `application_kits_id` PRIMARY KEY(`id`)
);
