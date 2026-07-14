DROP INDEX "sales_dues_sales_payment_id_due_date_unique";--> statement-breakpoint
DROP INDEX "sales_dues_due_date_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "sales_dues_sales_payment_id_due_date_sales_id_unique" ON "sales_dues" USING btree ("sales_id","sales_payment_id","due_date");