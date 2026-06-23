CREATE TYPE "public"."sequence_type" AS ENUM('VENDA', 'NFE', 'NFSE', 'NFCE', 'MDFE', 'CTE');--> statement-breakpoint
DROP INDEX "enterprises_sequences_enterprise_idx";--> statement-breakpoint
ALTER TABLE "enterprises_sequences" ALTER COLUMN "sequence" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "enterprises_sequences" ADD COLUMN "type" "sequence_type" NOT NULL;--> statement-breakpoint
ALTER TABLE "prices" ADD COLUMN "actual_real_cost" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "prices" ADD COLUMN "previous_cost" numeric(14, 4);--> statement-breakpoint
CREATE UNIQUE INDEX "enterprises_sequences_enterprise_type_uidx" ON "enterprises_sequences" USING btree ("enterprise_id","type");