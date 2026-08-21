DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE 'VEHICLES';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE 'VEHICLES_ENTERPRISES_MEMBERS';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE 'ENTERPRISES_MEMBER_SALES_ITEMS';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
