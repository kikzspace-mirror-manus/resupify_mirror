CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobCardId` int,
	`name` varchar(256) NOT NULL,
	`contactRole` varchar(256),
	`company` varchar(256),
	`email` varchar(320),
	`linkedinUrl` text,
	`phone` varchar(64),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credits_balances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`balance` int NOT NULL DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credits_balances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credits_ledger` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`amount` int NOT NULL,
	`reason` text NOT NULL,
	`referenceType` varchar(64),
	`referenceId` int,
	`balanceAfter` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credits_ledger_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidence_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`evidenceRunId` int NOT NULL,
	`groupType` enum('eligibility','tools','responsibilities','skills','soft_skills') NOT NULL,
	`jdRequirement` text NOT NULL,
	`resumeProof` text,
	`status` enum('matched','partial','missing') NOT NULL,
	`fix` text,
	`rewriteA` text,
	`rewriteB` text,
	`whyItMatters` text,
	`needsConfirmation` boolean DEFAULT false,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidence_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidence_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobCardId` int NOT NULL,
	`userId` int NOT NULL,
	`resumeId` int NOT NULL,
	`jdSnapshotId` int NOT NULL,
	`regionCode` varchar(16) NOT NULL,
	`trackCode` varchar(16) NOT NULL,
	`overallScore` int,
	`summary` text,
	`status` enum('pending','running','completed','failed') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `evidence_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `jd_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobCardId` int NOT NULL,
	`snapshotText` text NOT NULL,
	`sourceUrl` text,
	`version` int NOT NULL DEFAULT 1,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `jd_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `job_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`company` varchar(256),
	`location` varchar(256),
	`url` text,
	`stage` enum('bookmarked','applying','applied','interviewing','offered','rejected','archived') NOT NULL DEFAULT 'bookmarked',
	`priority` enum('low','medium','high') DEFAULT 'medium',
	`season` enum('fall','winter','summer','year_round'),
	`notes` text,
	`nextTouchAt` timestamp,
	`appliedAt` timestamp,
	`dueDate` timestamp,
	`salary` varchar(128),
	`jobType` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `outreach_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`direction` enum('sent','received') DEFAULT 'sent',
	`content` text NOT NULL,
	`messageType` enum('recruiter_email','linkedin_dm','follow_up_1','follow_up_2','custom') DEFAULT 'custom',
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `outreach_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `outreach_packs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobCardId` int NOT NULL,
	`recruiterEmail` text,
	`linkedinDm` text,
	`followUp1` text,
	`followUp2` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `outreach_packs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `outreach_threads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobCardId` int,
	`contactId` int,
	`subject` varchar(512),
	`channel` enum('email','linkedin','other') DEFAULT 'email',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `outreach_threads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resumes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`content` text NOT NULL,
	`fileUrl` text,
	`fileKey` text,
	`version` int NOT NULL DEFAULT 1,
	`parentId` int,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resumes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`jobCardId` int,
	`title` varchar(512) NOT NULL,
	`description` text,
	`taskType` enum('follow_up','apply','interview_prep','custom','outreach','review_evidence') DEFAULT 'custom',
	`completed` boolean DEFAULT false,
	`dueDate` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`regionCode` varchar(16) NOT NULL DEFAULT 'CA',
	`trackCode` enum('COOP','NEW_GRAD') NOT NULL DEFAULT 'COOP',
	`school` varchar(256),
	`program` varchar(256),
	`graduationDate` varchar(32),
	`currentlyEnrolled` boolean DEFAULT false,
	`onboardingComplete` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`)
);
