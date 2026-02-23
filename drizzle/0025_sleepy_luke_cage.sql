CREATE TABLE `ops_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lastStripeWebhookSuccessAt` timestamp,
	`lastStripeWebhookFailureAt` timestamp,
	`lastStripeWebhookEventId` varchar(128),
	`lastStripeWebhookEventType` varchar(128),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ops_status_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stripe_webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` varchar(128) NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`status` enum('processing','success','failed','duplicate') NOT NULL DEFAULT 'processing',
	`firstSeenAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	`errorSummary` text,
	`customerId` varchar(128),
	`userId` int,
	CONSTRAINT `stripe_webhook_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `stripe_webhook_events_eventId_unique` UNIQUE(`eventId`)
);
