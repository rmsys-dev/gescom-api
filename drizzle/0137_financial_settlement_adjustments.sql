ALTER TABLE "financial_settlements" ADD COLUMN "discount" numeric(15, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD COLUMN "increase" numeric(15, 2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_settlements" DROP CONSTRAINT "financial_settlements_amount_check";--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_amount_check" CHECK ("amount" >= 0);--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_discount_check" CHECK ("discount" >= 0);--> statement-breakpoint
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_increase_check" CHECK ("increase" >= 0);
