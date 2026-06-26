DROP INDEX IF EXISTS "promotional_prices_products_enterprises_id_unique";--> statement-breakpoint
DROP INDEX IF EXISTS "products_bar_code_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "products_bar_code_active_unique" ON "products" USING btree ("bar_code") WHERE "status" = 'ATIVO' AND "bar_code" IS NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS "type_networks_description_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "type_networks_description_active_unique" ON "type_networks" USING btree ("description") WHERE "status" = 'ATIVO';--> statement-breakpoint
DROP INDEX IF EXISTS "type_supplier_customers_description_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "type_supplier_customers_description_active_unique" ON "type_supplier_customers" USING btree ("description") WHERE "status" = 'ATIVO';--> statement-breakpoint
ALTER TABLE "members_personal_info" DROP CONSTRAINT IF EXISTS "members_personal_info_member_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "members_personal_info_member_active_unique" ON "members_personal_info" USING btree ("member_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "members_relationships" DROP CONSTRAINT IF EXISTS "members_relationships_member_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "members_relationships_member_active_unique" ON "members_relationships" USING btree ("member_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "members_tax_infos" DROP CONSTRAINT IF EXISTS "members_tax_infos_member_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "members_tax_infos_member_active_unique" ON "members_tax_infos" USING btree ("member_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE "members_financial_info" DROP CONSTRAINT IF EXISTS "members_financial_info_member_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "members_financial_info_member_active_unique" ON "members_financial_info" USING btree ("member_id") WHERE "deleted_at" IS NULL;--> statement-breakpoint
DROP INDEX IF EXISTS "enterprises_sequences_enterprise_type_uidx";--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_sequences_enterprise_type_uidx" ON "enterprises_sequences" USING btree ("enterprise_id","type") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "products_enterprises_enterprise_code_unique" ON "products_enterprises" USING btree ("enterprises_id","code") WHERE "code" IS NOT NULL;--> statement-breakpoint
ALTER INDEX IF EXISTS "measurement_units_unit_active_unique" RENAME TO "measurement_units_unit_unique";--> statement-breakpoint
ALTER INDEX IF EXISTS "products_types_type_active_unique" RENAME TO "products_types_type_unique";--> statement-breakpoint
ALTER INDEX IF EXISTS "products_ncm_ncm_active_unique" RENAME TO "products_ncm_ncm_unique";--> statement-breakpoint
ALTER INDEX IF EXISTS "products_cest_cest_active_unique" RENAME TO "products_cest_cest_ncm_unique";--> statement-breakpoint
ALTER INDEX IF EXISTS "type_sped_type_active_unique" RENAME TO "type_sped_type_unique";--> statement-breakpoint
ALTER INDEX IF EXISTS "stock_movements_type_status_unique" RENAME TO "payment_types_description_active_unique";
