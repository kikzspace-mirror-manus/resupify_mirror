CREATE TABLE `operational_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` varchar(36) NOT NULL,
	`endpointGroup` enum('evidence','outreach','kit','url_fetch','auth') NOT NULL,
	`eventType` enum('rate_limited','provider_error','validation_error','unknown') NOT NULL,
	`statusCode` int NOT NULL,
	`retryAfterSeconds` int,
	`userIdHash` varchar(16),
	`ipHash` varchar(16),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `operational_events_id` PRIMARY KEY(`id`)
);
