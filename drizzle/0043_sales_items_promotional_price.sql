ALTER TABLE "sales_items" ADD COLUMN IF NOT EXISTS "promotional_price_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_promotional_price_id_promotional_prices_id_fk" FOREIGN KEY ("promotional_price_id") REFERENCES "public"."promotional_prices"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_items_promotional_price_id_idx" ON "sales_items" USING btree ("promotional_price_id");
