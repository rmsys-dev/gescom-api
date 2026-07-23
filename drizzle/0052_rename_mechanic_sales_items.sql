ALTER TABLE "enterprises_member_sales_items" RENAME TO "mechanic_sales_items";--> statement-breakpoint
ALTER TABLE "mechanic_sales_items" RENAME COLUMN "enterprises_members_id" TO "mechanic";--> statement-breakpoint
ALTER INDEX IF EXISTS "enterprises_member_sales_items_unique" RENAME TO "mechanic_sales_items_unique";--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "mechanic_sales_items" RENAME CONSTRAINT "enterprises_member_sales_items_enterprises_members_id_enterprises_members_id_fk" TO "mechanic_sales_items_mechanic_enterprises_members_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "mechanic_sales_items" RENAME CONSTRAINT "enterprises_member_sales_items_sales_items_id_sales_items_id_fk" TO "mechanic_sales_items_sales_items_id_sales_items_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE 'MECHANIC_SALES_ITEMS';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
