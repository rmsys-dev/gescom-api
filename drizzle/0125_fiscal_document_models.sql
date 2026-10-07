CREATE TABLE IF NOT EXISTS "fiscal_document_models" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(2) NOT NULL,
  "description" varchar(255) NOT NULL,
  "electronic" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_document_models_code_unique" ON "fiscal_document_models" USING btree ("code");
--> statement-breakpoint
INSERT INTO "fiscal_document_models" ("code", "description", "electronic") VALUES
  ('01', 'Nota Fiscal modelo 1/1A', false),
  ('1B', 'Nota Fiscal Avulsa', false),
  ('02', 'Nota Fiscal de Venda a Consumidor', false),
  ('2D', 'Cupom Fiscal emitido por ECF', false),
  ('2E', 'Bilhete de Passagem emitido por ECF', false),
  ('04', 'Nota Fiscal de Produtor', false),
  ('06', 'Nota Fiscal/Conta de Energia Elétrica', false),
  ('07', 'Nota Fiscal de Serviço de Transporte', false),
  ('08', 'Conhecimento de Transporte Rodoviário de Cargas', false),
  ('8B', 'Conhecimento de Transporte de Cargas Avulso', false),
  ('09', 'Conhecimento de Transporte Aquaviário de Cargas', false),
  ('10', 'Conhecimento Aéreo', false),
  ('11', 'Conhecimento de Transporte Ferroviário de Cargas', false),
  ('13', 'Bilhete de Passagem Rodoviário', false),
  ('14', 'Bilhete de Passagem Aquaviário', false),
  ('15', 'Bilhete de Passagem e Nota de Bagagem', false),
  ('16', 'Bilhete de Passagem Ferroviário', false),
  ('18', 'Resumo de Movimento Diário', false),
  ('21', 'Nota Fiscal de Serviço de Comunicação', false),
  ('22', 'Nota Fiscal de Serviço de Telecomunicação', false),
  ('26', 'Conhecimento de Transporte Multimodal de Cargas', false),
  ('27', 'Nota Fiscal de Transporte Ferroviário de Cargas', false),
  ('28', 'Nota Fiscal/Conta de Fornecimento de Gás Canalizado', false),
  ('29', 'Nota Fiscal/Conta de Fornecimento de Água Canalizada', false),
  ('55', 'Nota Fiscal Eletrônica - NF-e', true),
  ('57', 'Conhecimento de Transporte Eletrônico - CT-e', true),
  ('59', 'Cupom Fiscal Eletrônico - CF-e SAT', true),
  ('60', 'Cupom Fiscal Eletrônico - CF-e ECF', true),
  ('62', 'Nota Fiscal Fatura Eletrônica de Serviços de Comunicação - NFCom', true),
  ('63', 'Bilhete de Passagem Eletrônico - BP-e', true),
  ('65', 'Nota Fiscal de Consumidor Eletrônica - NFC-e', true),
  ('66', 'Nota Fiscal de Energia Elétrica Eletrônica - NF3e', true),
  ('67', 'Conhecimento de Transporte Eletrônico para Outros Serviços - CT-e OS', true)
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
INSERT INTO "fiscal_document_models" ("code", "description")
SELECT DISTINCT used.mod, 'Modelo ' || used.mod
FROM (
  SELECT "mod" FROM "nfe_headers"
  UNION SELECT "mod" FROM "nfe_references"
  UNION SELECT "mod" FROM "nfe_events"
) AS used
WHERE used.mod IS NOT NULL AND used.mod <> ''
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
UPDATE "nfe_references" SET "mod" = NULL WHERE "mod" = '';
--> statement-breakpoint
UPDATE "nfe_events" SET "mod" = NULL WHERE "mod" = '';
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_headers" ADD CONSTRAINT "nfe_headers_mod_fiscal_document_models_code_fk" FOREIGN KEY ("mod") REFERENCES "public"."fiscal_document_models"("code") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_references" ADD CONSTRAINT "nfe_references_mod_fiscal_document_models_code_fk" FOREIGN KEY ("mod") REFERENCES "public"."fiscal_document_models"("code") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_events" ADD CONSTRAINT "nfe_events_mod_fiscal_document_models_code_fk" FOREIGN KEY ("mod") REFERENCES "public"."fiscal_document_models"("code") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
