DROP INDEX "users_active_name_unique";--> statement-breakpoint
DROP INDEX "users_active_registration_unique";--> statement-breakpoint
DROP INDEX "users_active_email_unique";--> statement-breakpoint
ALTER TABLE "users_address" ADD COLUMN "state_registration" varchar(255);--> statement-breakpoint
CREATE UNIQUE INDEX "users_active_identity_unique" ON "users" USING btree ("user_name","user_registration","user_email") WHERE "users"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_address_state_registration_active_unique" ON "users_address" USING btree ("state_registration") WHERE "users_address"."deleted_at" is null and "users_address"."state_registration" is not null;--> statement-breakpoint
ALTER TABLE "users_tax_infos" DROP COLUMN "state_registration";