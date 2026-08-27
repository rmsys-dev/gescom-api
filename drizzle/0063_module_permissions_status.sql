ALTER TABLE "module_permissions"
  ADD COLUMN IF NOT EXISTS "status" "status" DEFAULT 'ATIVO' NOT NULL;--> statement-breakpoint
ALTER TABLE "module_permissions"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone;
