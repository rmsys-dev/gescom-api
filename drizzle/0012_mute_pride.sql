ALTER TABLE "stock_locations" RENAME COLUMN "code" TO "box";--> statement-breakpoint
DROP INDEX "stock_locations_sector_code_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "stock_locations_sector_box_unique" ON "stock_locations" USING btree ("stock_sector_id","box");--> statement-breakpoint
CREATE INDEX "stock_locations_box_idx" ON "stock_locations" USING btree ("box");