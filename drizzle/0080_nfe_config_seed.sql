INSERT INTO "nfe_parameters" ("parameter", "value")
SELECT seed."parameter", seed."value"
FROM (
  VALUES
    ('portal_nfe', 'https://www.nfe.fazenda.gov.br/portal'),
    ('portal_consulta_nfe', 'https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx'),
    ('versao_layout', '4.00')
) AS seed("parameter", "value")
WHERE NOT EXISTS (
  SELECT 1
  FROM "nfe_parameters" p
  WHERE p."parameter" = seed."parameter"
    AND p."deleted_at" is null
);--> statement-breakpoint

INSERT INTO "enterprises_nfe" (
  "enterprise_id",
  "ambiente",
  "serie_nfe",
  "serie_nfce",
  "tipo_emissao"
)
SELECT e."id", 2, 1, 1, 1
FROM "enterprises" e
WHERE e."deleted_at" is null
  AND e."status" = 'ATIVO'
  AND NOT EXISTS (
    SELECT 1
    FROM "enterprises_nfe" n
    WHERE n."enterprise_id" = e."id"
      AND n."deleted_at" is null
  );
