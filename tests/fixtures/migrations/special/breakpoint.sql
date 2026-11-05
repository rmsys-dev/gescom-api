ALTER TABLE "public"."users" DROP COLUMN "old_name";--> statement-breakpoint
ALTER TABLE "public"."users" ADD COLUMN "new_name" varchar(10);
