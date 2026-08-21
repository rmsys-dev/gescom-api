ALTER TABLE "sales_items"
  ADD COLUMN IF NOT EXISTS "value_liquid_items_header" numeric(15, 4) NOT NULL DEFAULT '0';
