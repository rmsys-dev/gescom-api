ALTER TABLE "sales_items" DROP CONSTRAINT IF EXISTS "sales_items_id_unique";--> statement-breakpoint
ALTER TABLE "enterprises_members" DROP COLUMN IF EXISTS "sale_delete";