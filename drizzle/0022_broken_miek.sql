DROP INDEX "users_active_name_unique";--> statement-breakpoint
DROP INDEX "users_active_registration_unique";--> statement-breakpoint
DROP INDEX "users_active_email_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "users_active_name_unique" ON "users" USING btree ("user_name") WHERE "users"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_active_registration_unique" ON "users" USING btree ("user_registration") WHERE "users"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_active_email_unique" ON "users" USING btree ("user_email") WHERE "users"."deleted_at" is null;