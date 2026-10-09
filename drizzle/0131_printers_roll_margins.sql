ALTER TABLE "printers" ADD COLUMN IF NOT EXISTS "margin_top" numeric(4, 1) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "printers" ADD COLUMN IF NOT EXISTS "margin_bottom" numeric(4, 1) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "printers" ADD COLUMN IF NOT EXISTS "margin_left" numeric(4, 1) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE "printers" ADD COLUMN IF NOT EXISTS "margin_right" numeric(4, 1) DEFAULT '0' NOT NULL;
