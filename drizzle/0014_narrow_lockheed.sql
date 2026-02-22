CREATE TABLE `stripe_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stripeEventId` varchar(128) NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`userId` int,
	`creditsPurchased` int,
	`status` enum('processed','manual_review','skipped') NOT NULL DEFAULT 'processed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stripe_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `stripe_events_stripeEventId_unique` UNIQUE(`stripeEventId`)
);
