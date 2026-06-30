DROP INDEX "users_registration_active_unique";--> statement-breakpoint
DROP INDEX "users_email_active_unique";--> statement-breakpoint
DROP INDEX "users_phone_active_unique";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "user_registration" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "user_email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "user_phone" DROP NOT NULL;