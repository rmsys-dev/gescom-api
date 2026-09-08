-- Colunas de locação passam a locations_id / from_locations_id / to_locations_id.
-- Índices e FKs acompanham os nomes das entidades atuais.
-- Idempotente: ambiente que já recebeu rename parcial não quebra.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales_items' AND column_name = 'stock_sector_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales_items' AND column_name = 'sector_id'
  ) THEN
    ALTER TABLE "sales_items" RENAME COLUMN "stock_sector_id" TO "sector_id";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales_items' AND column_name = 'location_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales_items' AND column_name = 'locations_id'
  ) THEN
    ALTER TABLE "sales_items" RENAME COLUMN "location_id" TO "locations_id";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sectors_rental' AND column_name = 'location_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sectors_rental' AND column_name = 'locations_id'
  ) THEN
    ALTER TABLE "sectors_rental" RENAME COLUMN "location_id" TO "locations_id";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_batch_balances' AND column_name = 'location_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_batch_balances' AND column_name = 'locations_id'
  ) THEN
    ALTER TABLE "stock_batch_balances" RENAME COLUMN "location_id" TO "locations_id";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'from_location_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'from_locations_id'
  ) THEN
    ALTER TABLE "stock_movements" RENAME COLUMN "from_location_id" TO "from_locations_id";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'from_location_sector_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'from_locations_id'
  ) THEN
    ALTER TABLE "stock_movements" RENAME COLUMN "from_location_sector_id" TO "from_locations_id";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'to_location_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'to_locations_id'
  ) THEN
    ALTER TABLE "stock_movements" RENAME COLUMN "to_location_id" TO "to_locations_id";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'to_location_sector_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stock_movements' AND column_name = 'to_locations_id'
  ) THEN
    ALTER TABLE "stock_movements" RENAME COLUMN "to_location_sector_id" TO "to_locations_id";
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF to_regclass('public.locations_sector_box_unique') IS NULL
     AND to_regclass('public.locations_box_unique') IS NOT NULL THEN
    ALTER INDEX "locations_box_unique" RENAME TO "locations_sector_box_unique";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF to_regclass('public.locations_sector_idx') IS NULL
     AND to_regclass('public.locations_idx') IS NOT NULL THEN
    ALTER INDEX "locations_idx" RENAME TO "locations_sector_idx";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF to_regclass('public.batch_balances_batch_locations_unique') IS NULL
     AND to_regclass('public.batch_balances_batch_location_unique') IS NOT NULL THEN
    ALTER INDEX "batch_balances_batch_location_unique" RENAME TO "batch_balances_batch_locations_unique";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF to_regclass('public.stock_movements_from_locations_idx') IS NULL THEN
    IF to_regclass('public.stock_movements_from_location_idx') IS NOT NULL THEN
      ALTER INDEX "stock_movements_from_location_idx" RENAME TO "stock_movements_from_locations_idx";
    ELSIF to_regclass('public.stock_movements_from_location_sector_idx') IS NOT NULL THEN
      ALTER INDEX "stock_movements_from_location_sector_idx" RENAME TO "stock_movements_from_locations_idx";
    ELSIF to_regclass('public.stock_movements_from_locations_id_sector_idx') IS NOT NULL THEN
      ALTER INDEX "stock_movements_from_locations_id_sector_idx" RENAME TO "stock_movements_from_locations_idx";
    END IF;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF to_regclass('public.stock_movements_to_locations_idx') IS NULL THEN
    IF to_regclass('public.stock_movements_to_location_idx') IS NOT NULL THEN
      ALTER INDEX "stock_movements_to_location_idx" RENAME TO "stock_movements_to_locations_idx";
    ELSIF to_regclass('public.stock_movements_to_location_sector_idx') IS NOT NULL THEN
      ALTER INDEX "stock_movements_to_location_sector_idx" RENAME TO "stock_movements_to_locations_idx";
    ELSIF to_regclass('public.stock_movements_to_locations_sector_idx') IS NOT NULL THEN
      ALTER INDEX "stock_movements_to_locations_sector_idx" RENAME TO "stock_movements_to_locations_idx";
    END IF;
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "sales_items" RENAME CONSTRAINT "sales_items_stock_sector_id_sectors_id_fk" TO "sales_items_sector_id_sectors_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales_items" RENAME CONSTRAINT "sales_items_location_id_locations_id_fk" TO "sales_items_locations_id_locations_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sectors_rental" RENAME CONSTRAINT "sectors_rental_location_id_locations_id_fk" TO "sectors_rental_locations_id_locations_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_batch_balances" RENAME CONSTRAINT "stock_batch_balances_location_id_locations_id_fk" TO "stock_batch_balances_locations_id_locations_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_movements" RENAME CONSTRAINT "stock_movements_from_location_id_locations_id_fk" TO "stock_movements_from_locations_id_locations_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_movements" RENAME CONSTRAINT "stock_movements_to_location_id_locations_id_fk" TO "stock_movements_to_locations_id_locations_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_movements" RENAME CONSTRAINT "stock_movements_from_location_sector_id_locations_id_fk" TO "stock_movements_from_locations_id_locations_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_movements" RENAME CONSTRAINT "stock_movements_to_location_sector_id_locations_id_fk" TO "stock_movements_to_locations_id_locations_id_fk";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;
