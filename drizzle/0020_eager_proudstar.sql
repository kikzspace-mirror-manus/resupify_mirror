CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` varchar(64),
	`eventName` varchar(64) NOT NULL,
	`eventAt` timestamp NOT NULL DEFAULT (now()),
	`props` json,
	`countryPackId` varchar(16),
	`track` varchar(32),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
