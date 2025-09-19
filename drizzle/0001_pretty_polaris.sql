DROP INDEX "accounts_provider_provider_account_id_key";--> statement-breakpoint
DROP INDEX "activities_baby_id_ulid_key";--> statement-breakpoint
DROP INDEX "babies_inviteCode_unique";--> statement-breakpoint
DROP INDEX "baby_access_baby_id_user_id_key";--> statement-breakpoint
DROP INDEX "sessions_session_token_unique";--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
DROP INDEX "verification_tokens_token_unique";--> statement-breakpoint
ALTER TABLE `users` ALTER COLUMN "created_at" TO "created_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_provider_provider_account_id_key` ON `accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `activities_baby_id_ulid_key` ON `activities` (`baby_id`,`ulid`);--> statement-breakpoint
CREATE UNIQUE INDEX `babies_inviteCode_unique` ON `babies` (`inviteCode`);--> statement-breakpoint
CREATE UNIQUE INDEX `baby_access_baby_id_user_id_key` ON `baby_access` (`baby_id`,`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_session_token_unique` ON `sessions` (`session_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `verification_tokens_token_unique` ON `verification_tokens` (`token`);--> statement-breakpoint
ALTER TABLE `users` ALTER COLUMN "updated_at" TO "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP;