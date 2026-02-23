CREATE TABLE `refund_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`stripeChargeId` varchar(128) NOT NULL,
	`stripeRefundId` varchar(128) NOT NULL,
	`stripeCheckoutSessionId` varchar(128),
	`amountRefunded` int,
	`currency` varchar(8),
	`packId` varchar(64),
	`creditsToReverse` int,
	`status` enum('pending','processed','ignored') NOT NULL DEFAULT 'pending',
	`adminUserId` int,
	`ignoreReason` text,
	`ledgerEntryId` int,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `refund_queue_id` PRIMARY KEY(`id`),
	CONSTRAINT `refund_queue_stripeRefundId_unique` UNIQUE(`stripeRefundId`)
);
