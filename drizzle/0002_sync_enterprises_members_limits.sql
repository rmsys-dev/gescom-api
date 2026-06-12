ALTER TABLE "enterprises_members" ADD COLUMN IF NOT EXISTS "sale_limit" numeric(13, 10) NOT NULL DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD COLUMN IF NOT EXISTS "exceed_discount_sale" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD COLUMN IF NOT EXISTS "receipt_limit_discount" numeric(13, 10) NOT NULL DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD COLUMN IF NOT EXISTS "comission_on_sight" numeric(13, 10) NOT NULL DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD COLUMN IF NOT EXISTS "comission_to_terms" numeric(13, 10) NOT NULL DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD COLUMN IF NOT EXISTS "comission_partial" numeric(13, 10) NOT NULL DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD COLUMN IF NOT EXISTS "approved_at" date;--> statement-breakpoint
ALTER TABLE "enterprises_members" DROP COLUMN IF EXISTS "sale_delete";
