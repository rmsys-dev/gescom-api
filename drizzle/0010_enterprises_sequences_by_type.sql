CREATE TYPE "public"."sequence_type" AS ENUM('VENDA', 'NFE', 'NFSE', 'NFCE', 'MDFE', 'CTE');--> statement-breakpoint
TRUNCATE TABLE "enterprises_sequences";--> statement-breakpoint
ALTER TABLE "enterprises_sequences" DROP COLUMN "sequence";--> statement-breakpoint
ALTER TABLE "enterprises_sequences" ADD COLUMN "type" "sequence_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "enterprises_sequences" ADD COLUMN "sequence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DROP INDEX IF EXISTS "enterprises_sequences_enterprise_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_sequences_enterprise_type_uidx" ON "enterprises_sequences" USING btree ("enterprise_id","type");--> statement-breakpoint
INSERT INTO "enterprises_sequences" ("enterprise_id", "type", "sequence")
SELECT "enterprises_id", 'VENDA'::"sequence_type", COALESCE(MAX("order_number"), 0)
FROM "sales"
GROUP BY "enterprises_id"
ON CONFLICT ("enterprise_id", "type") DO UPDATE
  SET "sequence" = GREATEST("enterprises_sequences"."sequence", EXCLUDED."sequence");
