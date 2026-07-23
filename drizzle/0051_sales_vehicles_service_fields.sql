ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "vehicles_enterprises_members_id" uuid;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales" ADD CONSTRAINT "sales_vehicles_enterprises_members_id_vehicles_enterprises_members_id_fk"
    FOREIGN KEY ("vehicles_enterprises_members_id")
    REFERENCES "public"."vehicles_enterprises_members"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_vehicles_enterprises_members_id_idx"
  ON "sales" USING btree ("vehicles_enterprises_members_id");--> statement-breakpoint
UPDATE "sales" SET "vehicle_mileage" = 0 WHERE "vehicle_mileage" IS NULL;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "vehicle_mileage" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "vehicle_mileage" SET NOT NULL;--> statement-breakpoint
UPDATE "sales" SET "observations" = '' WHERE "observations" IS NULL;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "observations" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "observations" SET NOT NULL;--> statement-breakpoint
UPDATE "sales" SET "defect" = '' WHERE "defect" IS NULL;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "defect" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "defect" SET NOT NULL;--> statement-breakpoint
UPDATE "sales" SET "service_type" = 'SERVICO' WHERE "service_type" IS NULL;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "service_type" SET DEFAULT 'SERVICO';--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "service_type" SET NOT NULL;
