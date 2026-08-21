DO $$ BEGIN
  CREATE TYPE "public"."type_service" AS ENUM('PROPRIO', 'OUTROS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "sales_items" ADD COLUMN IF NOT EXISTS "type_service" "type_service" DEFAULT 'PROPRIO' NOT NULL;
