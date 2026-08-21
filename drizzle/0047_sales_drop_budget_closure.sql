-- Backfill orçamentos: budget_closure_situation -> sale_status
-- Idempotente: bancos que já não têm a coluna só fazem o DROP IF EXISTS.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sales'
      AND column_name = 'budget_closure_situation'
  ) THEN
    EXECUTE $sql$
      UPDATE "sales"
      SET "status" = 'PARCIAL'
      WHERE "type" = 'ORCAMENTO'
        AND "budget_closure_situation" = 'PARCIAL'
    $sql$;
    EXECUTE $sql$
      UPDATE "sales"
      SET "status" = 'FINALIZADA'
      WHERE "type" = 'ORCAMENTO'
        AND "budget_closure_situation" = 'FECHADO'
    $sql$;
    EXECUTE $sql$
      UPDATE "sales"
      SET "status" = 'ABERTA'
      WHERE "type" = 'ORCAMENTO'
        AND "budget_closure_situation" = 'ABERTO'
        AND "status" <> 'CANCELADA'
    $sql$;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "sales" DROP COLUMN IF EXISTS "budget_closure_situation";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."budget_closure_situation";
