INSERT INTO "modules" ("name", "description", "reference")
SELECT
  'Gerenciamento financeiro',
  'Contas a receber, contas a pagar, faturamento e boleto bancario',
  'financeiro'
WHERE NOT EXISTS (
  SELECT 1
  FROM "modules"
  WHERE "reference" = 'financeiro'
    AND "deleted_at" IS NULL
);--> statement-breakpoint
INSERT INTO "module_permissions" ("member_module_id", "permission", "status")
SELECT mm."id", p."permission", 'ALLOW'
FROM "member_modules" mm
JOIN "modules" m ON m."id" = mm."module_id"
JOIN (
  VALUES
    ('consultar_contas_receber', 'N1'),
    ('consultar_contas_pagar', 'N1'),
    ('consultar_faturamento', 'N1'),
    ('consultar_boleto_bancario', 'N1'),
    ('incluir_contas_receber', 'N3'),
    ('incluir_contas_pagar', 'N3'),
    ('incluir_faturamento', 'N3'),
    ('incluir_boleto_bancario', 'N3'),
    ('baixar_contas_receber', 'N4'),
    ('baixar_contas_pagar', 'N4'),
    ('alterar_boleto_bancario', 'N4')
) AS p("permission", "min_level") ON TRUE
WHERE m."reference" = 'administrador'
  AND mm."status" = 'ATIVO'
  AND mm."deleted_at" IS NULL
  AND (
    (p."min_level" = 'N1' AND mm."access_level" IN ('N1', 'N2', 'N3', 'N4', 'N5', 'N6'))
    OR (p."min_level" = 'N3' AND mm."access_level" IN ('N3', 'N4', 'N5', 'N6'))
    OR (p."min_level" = 'N4' AND mm."access_level" IN ('N4', 'N5', 'N6'))
  )
ON CONFLICT ("member_module_id", "permission") DO NOTHING;