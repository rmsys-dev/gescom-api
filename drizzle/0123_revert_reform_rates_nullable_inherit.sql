UPDATE "states" SET "ibs_uf_tax" = 0 WHERE "ibs_uf_tax" IS NULL;
--> statement-breakpoint
UPDATE "states" SET "ibs_municipal_tax" = 0 WHERE "ibs_municipal_tax" IS NULL;
--> statement-breakpoint
UPDATE "cities" SET "ibs_municipal_tax" = 0 WHERE "ibs_municipal_tax" IS NULL;
--> statement-breakpoint
ALTER TABLE "states" ALTER COLUMN "ibs_uf_tax" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "states" ALTER COLUMN "ibs_municipal_tax" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "cities" ALTER COLUMN "ibs_municipal_tax" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "countries" ALTER COLUMN "cbs_tax" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "countries" ALTER COLUMN "is_tax" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "countries" ALTER COLUMN "ibs_uf_tax" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "countries" ALTER COLUMN "ibs_municipal_tax" DROP DEFAULT;
