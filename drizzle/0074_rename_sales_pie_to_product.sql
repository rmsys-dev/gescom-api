-- Financeiro de pecas: pie -> product (schema TS ja usa os nomes novos).
-- Idempotente: ambiente que ja recebeu o rename nao quebra.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'percentage_discount_pie'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'percentage_discount_product'
  ) THEN
    ALTER TABLE "sales" RENAME COLUMN "percentage_discount_pie" TO "percentage_discount_product";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'value_discount_financial_pie'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'value_discount_financial_product'
  ) THEN
    ALTER TABLE "sales" RENAME COLUMN "value_discount_financial_pie" TO "value_discount_financial_product";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'percentage_acresce_pie'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'percentage_acresce_product'
  ) THEN
    ALTER TABLE "sales" RENAME COLUMN "percentage_acresce_pie" TO "percentage_acresce_product";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'value_acresce_financial_pie'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'value_acresce_financial_product'
  ) THEN
    ALTER TABLE "sales" RENAME COLUMN "value_acresce_financial_pie" TO "value_acresce_financial_product";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'value_pie'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'value_product'
  ) THEN
    ALTER TABLE "sales" RENAME COLUMN "value_pie" TO "value_product";
  END IF;
END $$;
