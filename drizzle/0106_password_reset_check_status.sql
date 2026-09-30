DO $$ BEGIN
  CREATE TYPE "public"."password_reset_check_status" AS ENUM('PENDENTE', 'VERIFICADO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD COLUMN IF NOT EXISTS "check_status" "password_reset_check_status" DEFAULT 'PENDENTE' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD COLUMN IF NOT EXISTS "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD COLUMN IF NOT EXISTS "reset_token_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD COLUMN IF NOT EXISTS "check_status" "password_reset_check_status" DEFAULT 'PENDENTE' NOT NULL;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD COLUMN IF NOT EXISTS "verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD COLUMN IF NOT EXISTS "reset_token_hash" varchar(255);
