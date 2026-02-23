CREATE TABLE `ops_status` (
	`id` int NOT NULL,
	`lastStripeWebhookSuccessAt` timestamp,
	`lastStripeWebhookFailureAt` timestamp,
	`lastStripeWebhookEventId` varchar(128),
	`lastStripeWebhookEventType` varchar(128),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ops_status_id` PRIMARY KEY(`id`)
);
