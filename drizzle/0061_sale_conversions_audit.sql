-- Generaliza auditoria de conversoes (orcamento/OS -> venda) preservando dados.
-- Idempotente: so aplica rename/alter se os nomes antigos ainda existirem.

DO $$ BEGIN
  CREATE TYPE "public"."sale_conversion_type" AS ENUM (
    'ORCAMENTO-VENDA',
    'ORCAMENTO-ORDEM_SERVICO',
    'ORDEM_SERVICO-VENDA'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."sale_conversion_closure_kind" AS ENUM ('PARCIAL', 'TOTAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sales_budget_conversions'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sale_conversions'
  ) THEN
    ALTER TABLE "sales_budget_conversions" RENAME TO "sale_conversions";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sales_budget_conversion_items'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sale_conversion_items'
  ) THEN
    ALTER TABLE "sales_budget_conversion_items" RENAME TO "sale_conversion_items";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sales_budget_unclosed_items'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sale_unclosed_items'
  ) THEN
    ALTER TABLE "sales_budget_unclosed_items" RENAME TO "sale_unclosed_items";
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sale_conversions'
      AND column_name = 'closure_kind'
      AND udt_name = 'budget_conversion_kind'
  ) THEN
    ALTER TABLE "sale_conversions"
      ALTER COLUMN "closure_kind" TYPE "public"."sale_conversion_closure_kind"
      USING "closure_kind"::text::"public"."sale_conversion_closure_kind";
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  DROP TYPE IF EXISTS "public"."budget_conversion_kind";
END $$;--> statement-breakpoint

ALTER TABLE "sale_conversions"
  ADD COLUMN IF NOT EXISTS "type_conversion" "public"."sale_conversion_type";--> statement-breakpoint

ALTER TABLE "sale_conversions"
  ADD COLUMN IF NOT EXISTS "work_order_sale_id" uuid;--> statement-breakpoint

UPDATE "sale_conversions" sc
SET "type_conversion" = CASE
  WHEN s."type" = 'ORDEM DE SERVICO' THEN 'ORCAMENTO-ORDEM_SERVICO'::"public"."sale_conversion_type"
  ELSE 'ORCAMENTO-VENDA'::"public"."sale_conversion_type"
END
FROM "sales" s
WHERE s."id" = sc."generated_sale_id"
  AND sc."type_conversion" IS NULL;--> statement-breakpoint

UPDATE "sale_conversions"
SET "type_conversion" = 'ORCAMENTO-VENDA'::"public"."sale_conversion_type"
WHERE "type_conversion" IS NULL;--> statement-breakpoint

ALTER TABLE "sale_conversions"
  ALTER COLUMN "type_conversion" SET NOT NULL;--> statement-breakpoint

ALTER TABLE "sale_conversions"
  ALTER COLUMN "budget_sale_id" DROP NOT NULL;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "sale_conversions"
    ADD CONSTRAINT "sale_conversions_work_order_sale_id_sales_id_fk"
    FOREIGN KEY ("work_order_sale_id") REFERENCES "public"."sales"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "sale_conversions"
    ADD CONSTRAINT "sale_conversions_source_by_type"
    CHECK (
      (
        "type_conversion" IN ('ORCAMENTO-VENDA', 'ORCAMENTO-ORDEM_SERVICO')
        AND "budget_sale_id" IS NOT NULL
        AND "work_order_sale_id" IS NULL
      )
      OR
      (
        "type_conversion" = 'ORDEM_SERVICO-VENDA'
        AND "work_order_sale_id" IS NOT NULL
        AND "budget_sale_id" IS NULL
      )
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_budget_conversions_enterprises_id_enterprises_id_fk'
  ) THEN
    ALTER TABLE "sale_conversions"
      RENAME CONSTRAINT "sales_budget_conversions_enterprises_id_enterprises_id_fk"
      TO "sale_conversions_enterprises_id_enterprises_id_fk";
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_budget_conversions_budget_sale_id_sales_id_fk'
  ) THEN
    ALTER TABLE "sale_conversions"
      RENAME CONSTRAINT "sales_budget_conversions_budget_sale_id_sales_id_fk"
      TO "sale_conversions_budget_sale_id_sales_id_fk";
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_budget_conversions_generated_sale_id_sales_id_fk'
  ) THEN
    ALTER TABLE "sale_conversions"
      RENAME CONSTRAINT "sales_budget_conversions_generated_sale_id_sales_id_fk"
      TO "sale_conversions_generated_sale_id_sales_id_fk";
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_budget_conversions_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "sale_conversions"
      RENAME CONSTRAINT "sales_budget_conversions_user_id_users_id_fk"
      TO "sale_conversions_user_id_users_id_fk";
  END IF;
END $$;--> statement-breakpoint

ALTER INDEX IF EXISTS "sales_budget_conversions_budget_sale_id_idx"
  RENAME TO "sale_conversions_budget_sale_id_idx";--> statement-breakpoint
ALTER INDEX IF EXISTS "sales_budget_conversions_generated_sale_id_idx"
  RENAME TO "sale_conversions_generated_sale_id_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sale_conversions_work_order_sale_id_idx"
  ON "sale_conversions" USING btree ("work_order_sale_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sale_conversions_type_conversion_idx"
  ON "sale_conversions" USING btree ("type_conversion");--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sale_conversion_items'
      AND column_name = 'conversion_id'
  ) THEN
    ALTER TABLE "sale_conversion_items" RENAME COLUMN "conversion_id" TO "sale_conversion_id";
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_budget_conversion_items_conversion_id_sales_budget_conversions_id_fk'
  ) THEN
    ALTER TABLE "sale_conversion_items"
      RENAME CONSTRAINT "sales_budget_conversion_items_conversion_id_sales_budget_conversions_id_fk"
      TO "sale_conversion_items_sale_conversion_id_sale_conversions_id_fk";
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_budget_conversion_items_sale_item_id_sales_items_id_fk'
  ) THEN
    ALTER TABLE "sale_conversion_items"
      RENAME CONSTRAINT "sales_budget_conversion_items_sale_item_id_sales_items_id_fk"
      TO "sale_conversion_items_sale_item_id_sales_items_id_fk";
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_budget_conversion_items_quantity_positive'
  ) THEN
    ALTER TABLE "sale_conversion_items"
      RENAME CONSTRAINT "sales_budget_conversion_items_quantity_positive"
      TO "sale_conversion_items_quantity_positive";
  END IF;
END $$;--> statement-breakpoint

DROP INDEX IF EXISTS "sales_budget_conversion_items_conversion_budget_item_unique";--> statement-breakpoint
ALTER TABLE "sale_conversion_items"
  DROP CONSTRAINT IF EXISTS "sales_budget_conversion_items_budget_item_id_sales_items_id_fk";--> statement-breakpoint
ALTER TABLE "sale_conversion_items"
  DROP COLUMN IF EXISTS "budget_item_id";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sale_conversion_items_sale_conversion_id_sale_item_id_unique"
  ON "sale_conversion_items" USING btree ("sale_conversion_id", "sale_item_id");--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sale_unclosed_items'
      AND column_name = 'conversion_id'
  ) THEN
    ALTER TABLE "sale_unclosed_items" RENAME COLUMN "conversion_id" TO "sale_conversion_id";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sale_unclosed_items'
      AND column_name = 'budget_item_id'
  ) THEN
    ALTER TABLE "sale_unclosed_items" RENAME COLUMN "budget_item_id" TO "sale_item_id";
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_budget_unclosed_items_conversion_id_sales_budget_conversions_id_fk'
  ) THEN
    ALTER TABLE "sale_unclosed_items"
      RENAME CONSTRAINT "sales_budget_unclosed_items_conversion_id_sales_budget_conversions_id_fk"
      TO "sale_unclosed_items_sale_conversion_id_sale_conversions_id_fk";
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_budget_unclosed_items_budget_item_id_sales_items_id_fk'
  ) THEN
    ALTER TABLE "sale_unclosed_items"
      RENAME CONSTRAINT "sales_budget_unclosed_items_budget_item_id_sales_items_id_fk"
      TO "sale_unclosed_items_sale_item_id_sales_items_id_fk";
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_budget_unclosed_items_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "sale_unclosed_items"
      RENAME CONSTRAINT "sales_budget_unclosed_items_user_id_users_id_fk"
      TO "sale_unclosed_items_user_id_users_id_fk";
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sales_budget_unclosed_items_quantity_positive'
  ) THEN
    ALTER TABLE "sale_unclosed_items"
      RENAME CONSTRAINT "sales_budget_unclosed_items_quantity_positive"
      TO "sale_unclosed_items_quantity_positive";
  END IF;
END $$;--> statement-breakpoint

ALTER INDEX IF EXISTS "sales_budget_unclosed_items_conversion_budget_item_unique"
  RENAME TO "sale_unclosed_items_sale_conversion_id_sale_item_id_unique";
