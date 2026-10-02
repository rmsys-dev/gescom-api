CREATE TABLE IF NOT EXISTS "enterprise_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "status" "status" DEFAULT 'ATIVO' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "enterprise_groups_name_active_unique" ON "enterprise_groups" ("name") WHERE "deleted_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "enterprises" ADD COLUMN IF NOT EXISTS "group_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "enterprises" ADD CONSTRAINT "enterprises_group_id_enterprise_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "enterprise_groups"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "enterprises_group_idx" ON "enterprises" ("group_id") WHERE "deleted_at" IS NULL;
