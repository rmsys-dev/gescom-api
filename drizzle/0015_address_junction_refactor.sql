ALTER TABLE "enterprises_address" ADD COLUMN IF NOT EXISTS "number" varchar(255);--> statement-breakpoint
ALTER TABLE "enterprises_address" ADD COLUMN IF NOT EXISTS "complement" varchar(255);--> statement-breakpoint
ALTER TABLE "members_address" ADD COLUMN IF NOT EXISTS "number" varchar(255);--> statement-breakpoint
ALTER TABLE "members_address" ADD COLUMN IF NOT EXISTS "complement" varchar(255);--> statement-breakpoint
UPDATE "enterprises_address" ea
SET
  "number" = COALESCE(c."number", 'S/N'),
  "complement" = c."complement"
FROM "ceps" c
WHERE ea."cep_id" = c."id"
  AND ea."number" IS NULL;--> statement-breakpoint
UPDATE "members_address" ma
SET
  "number" = COALESCE(c."number", 'S/N'),
  "complement" = c."complement"
FROM "ceps" c
WHERE ma."cep_id" = c."id"
  AND ma."number" IS NULL;--> statement-breakpoint
ALTER TABLE "enterprises_address" ALTER COLUMN "number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "members_address" ALTER COLUMN "number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "enterprises_address" DROP CONSTRAINT IF EXISTS "enterprises_address_country_id_countries_id_fk";--> statement-breakpoint
ALTER TABLE "enterprises_address" DROP CONSTRAINT IF EXISTS "enterprises_address_state_id_states_id_fk";--> statement-breakpoint
ALTER TABLE "enterprises_address" DROP CONSTRAINT IF EXISTS "enterprises_address_city_id_cities_id_fk";--> statement-breakpoint
ALTER TABLE "enterprises_address" DROP COLUMN IF EXISTS "country_id";--> statement-breakpoint
ALTER TABLE "enterprises_address" DROP COLUMN IF EXISTS "state_id";--> statement-breakpoint
ALTER TABLE "enterprises_address" DROP COLUMN IF EXISTS "city_id";--> statement-breakpoint
ALTER TABLE "members_address" DROP CONSTRAINT IF EXISTS "members_address_country_id_countries_id_fk";--> statement-breakpoint
ALTER TABLE "members_address" DROP CONSTRAINT IF EXISTS "members_address_state_id_states_id_fk";--> statement-breakpoint
ALTER TABLE "members_address" DROP CONSTRAINT IF EXISTS "members_address_city_id_cities_id_fk";--> statement-breakpoint
ALTER TABLE "members_address" DROP COLUMN IF EXISTS "country_id";--> statement-breakpoint
ALTER TABLE "members_address" DROP COLUMN IF EXISTS "state_id";--> statement-breakpoint
ALTER TABLE "members_address" DROP COLUMN IF EXISTS "city_id";--> statement-breakpoint
ALTER TABLE "states" ADD COLUMN IF NOT EXISTS "generate_st" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cities" DROP COLUMN IF EXISTS "city_code";--> statement-breakpoint
ALTER TABLE "cities" DROP COLUMN IF EXISTS "city_digit";--> statement-breakpoint
ALTER TABLE "ceps" DROP COLUMN IF EXISTS "number";--> statement-breakpoint
ALTER TABLE "ceps" DROP COLUMN IF EXISTS "complement";
