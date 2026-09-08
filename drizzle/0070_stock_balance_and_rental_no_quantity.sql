ALTER TABLE "products_enterprises" ADD COLUMN IF NOT EXISTS "stock_balance" numeric(14, 4) DEFAULT 0.0000;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD COLUMN IF NOT EXISTS "controls_rental" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "products_enterprises" pe
SET "stock_balance" = COALESCE((
  SELECT SUM(r."quantity") FROM "stock_sectors_rental" r
  WHERE r."products_enterprises_id" = pe."id"
), 0)
+ COALESCE((
  SELECT SUM(b."quantity") FROM "stock_batch_balances" b
  INNER JOIN "stock_batches" sb ON sb."id" = b."stock_batch_id"
  WHERE sb."products_enterprises_id" = pe."id"
), 0);--> statement-breakpoint
ALTER TABLE "products_enterprises" ALTER COLUMN "stock_balance" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_sectors_rental" DROP COLUMN IF EXISTS "quantity";--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "products_enterprises"
    ADD CONSTRAINT "products_enterprises_stock_balance_non_negative"
    CHECK ("stock_balance" >= 0);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
