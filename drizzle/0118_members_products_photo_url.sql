ALTER TABLE "enterprises_members" ADD COLUMN IF NOT EXISTS "photo_url" varchar(500);
--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD COLUMN IF NOT EXISTS "photo_url" varchar(500);
