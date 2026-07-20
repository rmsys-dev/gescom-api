DO $$ BEGIN
  CREATE TYPE "public"."integer_or_fractional" AS ENUM('INTEIRO', 'FRACIONADO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "measurement_units" ADD COLUMN IF NOT EXISTS "whole_fractional" "integer_or_fractional";--> statement-breakpoint
UPDATE "measurement_units" SET "whole_fractional" = 'INTEIRO' WHERE "whole_fractional" IS NULL;--> statement-breakpoint
ALTER TABLE "measurement_units" ALTER COLUMN "whole_fractional" SET NOT NULL;
