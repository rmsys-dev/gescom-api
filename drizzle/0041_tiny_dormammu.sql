DROP INDEX IF EXISTS "payment_types_description_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "payment_types_description_active_unique" ON "payment_types" USING btree ("description");