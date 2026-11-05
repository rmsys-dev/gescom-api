ALTER TABLE "public"."users" ADD COLUMN "total" integer GENERATED ALWAYS AS (1) STORED;
