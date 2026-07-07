DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users_financial_info'
      AND column_name = 'budget_price'
  ) THEN
    ALTER TABLE "users_financial_info" RENAME COLUMN "budget_price" TO "credit_limit";
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users_financial_info'
      AND column_name = 'reduction_rate'
  ) THEN
    ALTER TABLE "users_financial_info" RENAME COLUMN "reduction_rate" TO "billing_commission";
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "users_financial_info" ALTER COLUMN "icms_reduction" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "users_financial_info" ALTER COLUMN "discount_limit" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "users_financial_info" ALTER COLUMN "request_amount" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "users_financial_info" ALTER COLUMN "credit_limit" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "users_financial_info" ALTER COLUMN "prev_rate" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "users_financial_info" ALTER COLUMN "rat_tax" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "users_financial_info" ALTER COLUMN "billing_commission" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "users_financial_info" ALTER COLUMN "senar_tax" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "users_financial_info" ALTER COLUMN "sale_discount" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "users_relationships" ALTER COLUMN "income" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "icms_taxation" ALTER COLUMN "icms_rate" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "icms_taxation" ALTER COLUMN "simples_icms_rate" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "pis_cofins_situation" ALTER COLUMN "pis_rate" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "pis_cofins_situation" ALTER COLUMN "cofins_rate" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "prices" ALTER COLUMN "price" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "prices" ALTER COLUMN "average_cost" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "prices" ALTER COLUMN "actual_real_cost" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "prices" ALTER COLUMN "previous_cost" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "prices" ALTER COLUMN "price_cost" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "product_groups" ALTER COLUMN "profit_margin" SET DATA TYPE numeric(15, 10);--> statement-breakpoint
ALTER TABLE "promotional_prices" ALTER COLUMN "price" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "sub_total" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "discount_value_items" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "value_discount_financial" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "value_acresce_items" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "value_acresce_financial" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "value_pie" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "value_service" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "value_liquid" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales_budget_conversion_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_budget_unclosed_items" ALTER COLUMN "quantity_not_converted" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_dues" ALTER COLUMN "value_installment" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_items" ALTER COLUMN "value_unit" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_items" ALTER COLUMN "value_discount" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_items" ALTER COLUMN "value_acresce" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_items" ALTER COLUMN "value_total" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_items" ALTER COLUMN "quantity_returned" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_items" ALTER COLUMN "quantity_returned" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "sales_items" ALTER COLUMN "quantity_converted" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_items" ALTER COLUMN "quantity_converted" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "sales_payments" ALTER COLUMN "value_total" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales_return_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_return_items" ALTER COLUMN "value_unit" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "sales_return_items" ALTER COLUMN "value_total" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales_returns" ALTER COLUMN "value_total" SET DATA TYPE numeric(15, 2);--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "quantity" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "from_quantity_before" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "from_quantity_after" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "to_quantity_before" SET DATA TYPE numeric(15, 4);--> statement-breakpoint
ALTER TABLE "stock_movements" ALTER COLUMN "to_quantity_after" SET DATA TYPE numeric(15, 4);
