-- Cadastro de setores/locações deixa de viver em tabelas stock_* e passa a sectors/locations/sectors_rental.
-- Idempotente: ambiente que já recebeu push/rename parcial não quebra.
DO $$ BEGIN
  IF to_regclass('public.stock_sectors') IS NOT NULL
     AND to_regclass('public.sectors') IS NULL THEN
    ALTER TABLE "stock_sectors" RENAME TO "sectors";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF to_regclass('public.stock_locations') IS NOT NULL
     AND to_regclass('public.locations') IS NULL THEN
    ALTER TABLE "stock_locations" RENAME TO "locations";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF to_regclass('public.stock_sectors_rental') IS NOT NULL
     AND to_regclass('public.sectors_rental') IS NULL THEN
    ALTER TABLE "stock_sectors_rental" RENAME TO "sectors_rental";
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'locations' AND column_name = 'stock_sector_id'
  ) THEN
    ALTER TABLE "locations" RENAME COLUMN "stock_sector_id" TO "sector_id";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sectors_rental' AND column_name = 'stock_location_id'
  ) THEN
    ALTER TABLE "sectors_rental" RENAME COLUMN "stock_location_id" TO "location_id";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_batch_balances' AND column_name = 'stock_location_id'
  ) THEN
    ALTER TABLE "stock_batch_balances" RENAME COLUMN "stock_location_id" TO "location_id";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'from_stock_sector_id'
  ) THEN
    ALTER TABLE "stock_movements" RENAME COLUMN "from_stock_sector_id" TO "from_sector_id";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'from_stock_location_id'
  ) THEN
    ALTER TABLE "stock_movements" RENAME COLUMN "from_stock_location_id" TO "from_location_id";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'to_stock_sector_id'
  ) THEN
    ALTER TABLE "stock_movements" RENAME COLUMN "to_stock_sector_id" TO "to_sector_id";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'to_stock_location_id'
  ) THEN
    ALTER TABLE "stock_movements" RENAME COLUMN "to_stock_location_id" TO "to_location_id";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales_items' AND column_name = 'stock_location_id'
  ) THEN
    ALTER TABLE "sales_items" RENAME COLUMN "stock_location_id" TO "location_id";
  END IF;
END $$;--> statement-breakpoint

ALTER INDEX IF EXISTS "stock_sectors_pkey" RENAME TO "sectors_pkey";--> statement-breakpoint
ALTER INDEX IF EXISTS "stock_locations_pkey" RENAME TO "locations_pkey";--> statement-breakpoint
ALTER INDEX IF EXISTS "stock_sectors_rental_pkey" RENAME TO "sectors_rental_pkey";--> statement-breakpoint
ALTER INDEX IF EXISTS "stock_sectors_enterprise_description_unique" RENAME TO "sectors_enterprise_description_unique";--> statement-breakpoint
ALTER INDEX IF EXISTS "stock_sectors_enterprise_idx" RENAME TO "sectors_enterprise_idx";--> statement-breakpoint
ALTER INDEX IF EXISTS "stock_locations_sector_box_unique" RENAME TO "locations_sector_box_unique";--> statement-breakpoint
ALTER INDEX IF EXISTS "stock_locations_sector_idx" RENAME TO "locations_sector_idx";--> statement-breakpoint
ALTER INDEX IF EXISTS "stock_locations_box_idx" RENAME TO "locations_box_idx";--> statement-breakpoint
ALTER INDEX IF EXISTS "stock_sectors_rental_product_location_unique" RENAME TO "sectors_rental_product_location_unique";--> statement-breakpoint
ALTER INDEX IF EXISTS "stock_batch_balances_batch_location_unique" RENAME TO "batch_balances_batch_location_unique";--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "sectors" RENAME CONSTRAINT "stock_sectors_enterprises_id_enterprises_id_fk" TO "sectors_enterprises_id_enterprises_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "locations" RENAME CONSTRAINT "stock_locations_stock_sector_id_stock_sectors_id_fk" TO "locations_sector_id_sectors_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sectors_rental" RENAME CONSTRAINT "stock_sectors_rental_products_enterprises_id_products_enterprises_id_fk" TO "sectors_rental_products_enterprises_id_products_enterprises_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sectors_rental" RENAME CONSTRAINT "stock_sectors_rental_stock_location_id_stock_locations_id_fk" TO "sectors_rental_location_id_locations_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_batch_balances" RENAME CONSTRAINT "stock_batch_balances_stock_location_id_stock_locations_id_fk" TO "stock_batch_balances_location_id_locations_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_batch_balances" RENAME CONSTRAINT "stock_batch_balances_quantity_non_negative" TO "batch_balances_quantity_non_negative";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_movements" RENAME CONSTRAINT "stock_movements_from_stock_sector_id_stock_sectors_id_fk" TO "stock_movements_from_sector_id_sectors_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_movements" RENAME CONSTRAINT "stock_movements_from_stock_location_id_stock_locations_id_fk" TO "stock_movements_from_location_id_locations_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_movements" RENAME CONSTRAINT "stock_movements_to_stock_sector_id_stock_sectors_id_fk" TO "stock_movements_to_sector_id_sectors_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_movements" RENAME CONSTRAINT "stock_movements_to_stock_location_id_stock_locations_id_fk" TO "stock_movements_to_location_id_locations_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales_items" RENAME CONSTRAINT "sales_items_stock_sector_id_stock_sectors_id_fk" TO "sales_items_stock_sector_id_sectors_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales_items" RENAME CONSTRAINT "sales_items_stock_location_id_stock_locations_id_fk" TO "sales_items_location_id_locations_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales_items" RENAME CONSTRAINT "sales_items_stock_location_id_locations_id_fk" TO "sales_items_location_id_locations_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'entity_type'
      AND e.enumlabel = 'STOCK_LOCATIONS'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'entity_type'
      AND e.enumlabel = 'LOCATIONS'
  ) THEN
    ALTER TYPE "public"."entity_type" RENAME VALUE 'STOCK_LOCATIONS' TO 'LOCATIONS';
  END IF;
END $$;
