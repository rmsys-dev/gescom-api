ALTER TABLE "enterprises" ADD COLUMN IF NOT EXISTS "state_registration" varchar(14);
--> statement-breakpoint
ALTER TABLE "enterprises" ADD COLUMN IF NOT EXISTS "municipal_registration" varchar(15);
--> statement-breakpoint
ALTER TABLE "enterprises" ADD COLUMN IF NOT EXISTS "crt" "public"."regime_tributario";
