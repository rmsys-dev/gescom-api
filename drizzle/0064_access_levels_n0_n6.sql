-- Escala N0–N6: incluir e alterar em níveis distintos; emitir→relatorio; visualizar→gerenciais.
-- Remapeia access_level gravado (N3 antigo = incluir+alterar → N4; N4→N5; N5→N6).

DO $$ BEGIN
  ALTER TYPE "public"."access_level" ADD VALUE IF NOT EXISTS 'N6';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

UPDATE "member_modules" SET "access_level" = 'N6' WHERE "access_level" = 'N5';--> statement-breakpoint
UPDATE "member_modules" SET "access_level" = 'N5' WHERE "access_level" = 'N4';--> statement-breakpoint
UPDATE "member_modules" SET "access_level" = 'N4' WHERE "access_level" = 'N3';--> statement-breakpoint

UPDATE "module_permissions"
  SET "permission" = 'gerenciais_vendas', "updated_at" = now()
  WHERE "permission" = 'visualizar_relatorio_vendas';
