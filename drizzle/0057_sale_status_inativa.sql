-- Status INATIVA previsto no enum Drizzle/código, mas ausente em alguns bancos
-- (ex.: ambientes em que PARCIAL foi adicionado sem INATIVA).
DO $$ BEGIN
  ALTER TYPE "public"."sale_status" ADD VALUE 'INATIVA';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
