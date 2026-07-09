DROP INDEX "products_bar_code_active_unique";--> statement-breakpoint
DROP INDEX "products_description_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "products_description_bar_code_active_unique" ON "products" USING btree ("description","bar_code") WHERE "products"."status" = 'ATIVO';