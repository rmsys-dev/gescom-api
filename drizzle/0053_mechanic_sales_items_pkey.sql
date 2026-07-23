DO $$ BEGIN
  ALTER TABLE "mechanic_sales_items" RENAME CONSTRAINT "enterprises_member_sales_items_pkey" TO "mechanic_sales_items_pkey";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;
