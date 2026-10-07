ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'PRINTERS';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "printers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprises_id" uuid NOT NULL,
  "status" "status" DEFAULT 'ATIVO' NOT NULL,
  "description" varchar(255) NOT NULL,
  "computer_name" varchar(63) NOT NULL,
  "share_name" varchar(255) NOT NULL,
  "paper_type" varchar(20) DEFAULT 'A4' NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone,
  CONSTRAINT "printers_paper_type_chk" CHECK ("paper_type" in ('A4', 'BOBINA_80', 'BOBINA_58'))
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "printers" ADD CONSTRAINT "printers_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "printers_enterprise_computer_share_unique" ON "printers" ("enterprises_id",lower("computer_name"),lower("share_name"));
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "printers_enterprise_default_unique" ON "printers" ("enterprises_id") WHERE "is_default" = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "printers_enterprise_idx" ON "printers" ("enterprises_id");
