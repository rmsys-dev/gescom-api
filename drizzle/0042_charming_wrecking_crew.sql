DROP INDEX IF EXISTS "type_supplier_customers_description_active_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "type_networks_description_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "type_supplier_customers_description_active_unique" ON "type_supplier_customers" USING btree ("description");--> statement-breakpoint
CREATE UNIQUE INDEX "type_networks_description_active_unique" ON "type_networks" USING btree ("description");