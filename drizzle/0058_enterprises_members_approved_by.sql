ALTER TABLE "enterprises_members" ADD COLUMN IF NOT EXISTS "approved_by" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_approved_by_users_id_fk"
    FOREIGN KEY ("approved_by")
    REFERENCES "public"."users"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
