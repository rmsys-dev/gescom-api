DROP INDEX "products_enterprises_enterprise_code_unique";--> statement-breakpoint
DROP INDEX "products_enterprises_product_id_enterprises_id_unique";--> statement-breakpoint
DROP INDEX "sales_returns_sales_id_return_order_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "products_enterprises_product_id_enterprises_id_unique" ON "products_enterprises" USING btree ("product_id","enterprises_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_returns_sales_id_return_order_unique" ON "sales_returns" USING btree ("sales_id","sale_item_id","return_order");