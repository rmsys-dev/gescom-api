ALTER TYPE "public"."nfe_invoice_status" RENAME VALUE 'RASCUNHO' TO 'PENDENTE';
--> statement-breakpoint
ALTER TABLE "nfe_headers" ALTER COLUMN "status" SET DEFAULT 'PENDENTE';
