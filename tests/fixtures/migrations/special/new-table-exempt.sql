CREATE TABLE "public"."nova" ("id" integer);
ALTER TABLE "public"."nova" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."nova" ADD CONSTRAINT "nova_id_uq" UNIQUE ("id");
CREATE INDEX "nova_id_idx" ON "public"."nova" ("id");
