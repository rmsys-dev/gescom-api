-- Backfill orçamentos: budget_closure_situation -> sale_status
-- (PARCIAL ja commitado na 0046; pode ser usado nesta transaction)
UPDATE "sales"
SET "status" = 'PARCIAL'
WHERE "type" = 'ORCAMENTO'
  AND "budget_closure_situation" = 'PARCIAL';--> statement-breakpoint
UPDATE "sales"
SET "status" = 'FINALIZADA'
WHERE "type" = 'ORCAMENTO'
  AND "budget_closure_situation" = 'FECHADO';--> statement-breakpoint
UPDATE "sales"
SET "status" = 'ABERTA'
WHERE "type" = 'ORCAMENTO'
  AND "budget_closure_situation" = 'ABERTO'
  AND "status" <> 'CANCELADA';--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN IF EXISTS "budget_closure_situation";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."budget_closure_situation";
