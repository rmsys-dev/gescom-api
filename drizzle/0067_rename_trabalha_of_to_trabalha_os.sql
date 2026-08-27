-- Renomeia o slug do parâmetro de OF para OS (ordem de serviço).
UPDATE "enterprise_parameters"
SET "parameter" = 'trabalha_os',
    "updated_at" = now()
WHERE "parameter" = 'trabalha_of';
