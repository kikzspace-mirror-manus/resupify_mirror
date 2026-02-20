CREATE TABLE `job_card_requirements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobCardId` int NOT NULL,
	`jdSnapshotId` int NOT NULL,
	`requirementText` text NOT NULL,
	`requirementType` enum('skill','responsibility','tool','softskill','eligibility') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_card_requirements_id` PRIMARY KEY(`id`)
);
