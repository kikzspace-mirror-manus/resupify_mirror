CREATE TABLE `purchase_receipts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`stripeCheckoutSessionId` varchar(128) NOT NULL,
	`packId` varchar(64) NOT NULL,
	`creditsAdded` int NOT NULL,
	`amountCents` int,
	`currency` varchar(8),
	`stripePaymentIntentId` varchar(128),
	`stripeReceiptUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_receipts_stripeCheckoutSessionId_unique` UNIQUE(`stripeCheckoutSessionId`)
);
