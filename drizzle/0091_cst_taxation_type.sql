DO $$ BEGIN
  CREATE TYPE "public"."taxation_type" AS ENUM ('1', '2', '3', '4');
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
ALTER TABLE "situation_tributary_cst" ADD COLUMN IF NOT EXISTS "taxation_type" "taxation_type" DEFAULT '1' NOT NULL;
