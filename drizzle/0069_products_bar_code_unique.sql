CREATE UNIQUE INDEX IF NOT EXISTS "products_bar_code_unique"
  ON "products" USING btree ("bar_code")
  WHERE "products"."bar_code" is not null;
