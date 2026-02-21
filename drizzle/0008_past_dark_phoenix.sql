ALTER TABLE `user_profiles` ADD `workStatus` enum('citizen_pr','temporary_resident','unknown') DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `workStatusDetail` enum('open_work_permit','employer_specific_permit','student_work_authorization','other');--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `needsSponsorship` enum('true','false','unknown') DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `countryOfResidence` varchar(128);--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `willingToRelocate` boolean;