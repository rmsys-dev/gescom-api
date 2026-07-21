-- Enums/colunas de OS (sem usar o novo valor PARCIAL nesta transaction)
DO $$ BEGIN
  ALTER TYPE "public"."sale_status" ADD VALUE 'PARCIAL';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."sale_type" RENAME VALUE 'OUTRO' TO 'ORDEM DE SERVICO';
EXCEPTION
  WHEN undefined_object THEN null;
  WHEN invalid_parameter_value THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."order_service_model" AS ENUM('VEICULO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "model_service" "order_service_model";
