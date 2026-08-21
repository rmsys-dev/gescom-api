ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "source_work_order_sale_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_source_work_order_sale_id_sales_id_fk" FOREIGN KEY ("source_work_order_sale_id") REFERENCES "public"."sales"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_source_work_order_sale_id_idx" ON "sales" USING btree ("source_work_order_sale_id");--> statement-breakpoint
ALTER TABLE "sales_items" ADD COLUMN IF NOT EXISTS "source_work_order_item_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales_items" ADD CONSTRAINT "sales_items_source_work_order_item_id_sales_items_id_fk" FOREIGN KEY ("source_work_order_item_id") REFERENCES "public"."sales_items"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_items_source_work_order_item_id_idx" ON "sales_items" USING btree ("source_work_order_item_id");
