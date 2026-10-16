INSERT INTO "modules" ("name", "description", "reference")
SELECT
  'Gerenciamento de ordem de serviço',
  'Ordens de serviço da empresa',
  'ordem_servico'
WHERE NOT EXISTS (
  SELECT 1
  FROM "modules"
  WHERE "reference" = 'ordem_servico'
    AND "deleted_at" IS NULL
);
