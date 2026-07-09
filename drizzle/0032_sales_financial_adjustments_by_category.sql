ALTER TABLE "sales" ADD COLUMN "percentage_discount_pie" numeric(15, 10);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "value_discount_financial_pie" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "percentage_discount_service" numeric(15, 10);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "value_discount_financial_service" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "percentage_acresce_pie" numeric(15, 10);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "value_acresce_financial_pie" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "percentage_acresce_service" numeric(15, 10);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "value_acresce_financial_service" numeric(15, 2);--> statement-breakpoint
UPDATE "sales" SET
  "value_discount_financial_pie" = CASE
    WHEN COALESCE("value_pie", 0) + COALESCE("value_service", 0) > 0
    THEN ROUND(
      COALESCE("value_discount_financial", 0) * COALESCE("value_pie", 0)
      / (COALESCE("value_pie", 0) + COALESCE("value_service", 0)),
      2
    )
    ELSE COALESCE("value_discount_financial", 0)
  END,
  "value_discount_financial_service" = CASE
    WHEN COALESCE("value_pie", 0) + COALESCE("value_service", 0) > 0
    THEN ROUND(
      COALESCE("value_discount_financial", 0) * COALESCE("value_service", 0)
      / (COALESCE("value_pie", 0) + COALESCE("value_service", 0)),
      2
    )
    ELSE 0
  END
WHERE COALESCE("value_discount_financial", 0) <> 0;--> statement-breakpoint
UPDATE "sales" SET
  "percentage_discount_pie" = "percentage_discount",
  "percentage_discount_service" = "percentage_discount"
WHERE "percentage_discount" IS NOT NULL
  AND COALESCE("value_discount_financial", 0) = 0;--> statement-breakpoint
UPDATE "sales" SET
  "value_acresce_financial_pie" = CASE
    WHEN COALESCE("value_pie", 0) + COALESCE("value_service", 0) > 0
    THEN ROUND(
      COALESCE("value_acresce_financial", 0) * COALESCE("value_pie", 0)
      / (COALESCE("value_pie", 0) + COALESCE("value_service", 0)),
      2
    )
    ELSE COALESCE("value_acresce_financial", 0)
  END,
  "value_acresce_financial_service" = CASE
    WHEN COALESCE("value_pie", 0) + COALESCE("value_service", 0) > 0
    THEN ROUND(
      COALESCE("value_acresce_financial", 0) * COALESCE("value_service", 0)
      / (COALESCE("value_pie", 0) + COALESCE("value_service", 0)),
      2
    )
    ELSE 0
  END
WHERE COALESCE("value_acresce_financial", 0) <> 0;--> statement-breakpoint
UPDATE "sales" SET
  "percentage_acresce_pie" = "percentage_acresce",
  "percentage_acresce_service" = "percentage_acresce"
WHERE "percentage_acresce" IS NOT NULL
  AND COALESCE("value_acresce_financial", 0) = 0;--> statement-breakpoint
UPDATE "sales" SET "value_liquid" = GREATEST(
  0,
  ROUND(
    COALESCE("value_pie", 0) + COALESCE("value_service", 0)
    - COALESCE("value_discount_financial_pie", 0)
    - COALESCE("value_discount_financial_service", 0)
    + COALESCE("value_acresce_financial_pie", 0)
    + COALESCE("value_acresce_financial_service", 0),
    2
  )
);--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "percentage_discount";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "value_discount_financial";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "percentage_acresce";--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN "value_acresce_financial";
