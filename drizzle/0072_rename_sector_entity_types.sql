DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'entity_type'
      AND e.enumlabel = 'STOCK_SECTORS'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'entity_type'
      AND e.enumlabel = 'SECTORS'
  ) THEN
    ALTER TYPE "public"."entity_type" RENAME VALUE 'STOCK_SECTORS' TO 'SECTORS';
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'entity_type'
      AND e.enumlabel = 'STOCK_SECTORS_RENTAL'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'entity_type'
      AND e.enumlabel = 'SECTORS_RENTAL'
  ) THEN
    ALTER TYPE "public"."entity_type" RENAME VALUE 'STOCK_SECTORS_RENTAL' TO 'SECTORS_RENTAL';
  END IF;
END $$;
