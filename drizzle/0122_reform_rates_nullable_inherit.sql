ALTER TABLE "countries" ALTER COLUMN "cbs_tax" SET DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "countries" ALTER COLUMN "is_tax" SET DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "countries" ALTER COLUMN "ibs_uf_tax" SET DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "countries" ALTER COLUMN "ibs_municipal_tax" SET DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "states" ALTER COLUMN "ibs_uf_tax" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "states" ALTER COLUMN "ibs_uf_tax" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "states" ALTER COLUMN "ibs_municipal_tax" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "states" ALTER COLUMN "ibs_municipal_tax" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "cities" ALTER COLUMN "ibs_municipal_tax" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "cities" ALTER COLUMN "ibs_municipal_tax" DROP DEFAULT;
--> statement-breakpoint
UPDATE "states" SET "ibs_uf_tax" = NULL WHERE "ibs_uf_tax" = 0;
--> statement-breakpoint
UPDATE "states" SET "ibs_municipal_tax" = NULL WHERE "ibs_municipal_tax" = 0;
--> statement-breakpoint
UPDATE "cities" SET "ibs_municipal_tax" = NULL WHERE "ibs_municipal_tax" = 0;
