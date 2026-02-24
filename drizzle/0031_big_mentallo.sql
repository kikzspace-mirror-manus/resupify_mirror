CREATE TABLE `admin_settings` (
	`key` varchar(128) NOT NULL,
	`value_json` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_settings_key` PRIMARY KEY(`key`)
);
