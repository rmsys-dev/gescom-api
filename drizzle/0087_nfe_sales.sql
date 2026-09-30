CREATE TABLE IF NOT EXISTS "nfe_sales" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nfe_header_id" uuid NOT NULL,
  "sales_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_sales" ADD CONSTRAINT "nfe_sales_nfe_header_id_nfe_headers_id_fk" FOREIGN KEY ("nfe_header_id") REFERENCES "public"."nfe_headers"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_sales" ADD CONSTRAINT "nfe_sales_sales_id_sales_id_fk" FOREIGN KEY ("sales_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfe_sales_sale_active_unique" ON "nfe_sales" ("sales_id") WHERE "deleted_at" is null;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nfe_sales_header_idx" ON "nfe_sales" ("nfe_header_id");
