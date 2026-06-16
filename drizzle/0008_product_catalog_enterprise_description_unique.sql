CREATE UNIQUE INDEX IF NOT EXISTS "product_brands_enterprise_description_unique" ON "product_brands" USING btree ("enterprises_id","description");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_groups_enterprise_description_unique" ON "product_groups" USING btree ("enterprises_id","description");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_subgroups_enterprise_description_unique" ON "product_subgroups" USING btree ("enterprises_id","description");
