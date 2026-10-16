INSERT INTO "module_permissions" ("member_module_id", "permission", "status")
SELECT mm."id", 'consultar_ordem_servico', 'ALLOW'
FROM "member_modules" mm
JOIN "modules" m ON m."id" = mm."module_id"
WHERE m."reference" = 'administrador'
  AND mm."access_level" IN ('N1', 'N2', 'N3', 'N4', 'N5', 'N6')
  AND mm."status" = 'ATIVO'
  AND mm."deleted_at" IS NULL
ON CONFLICT ("member_module_id", "permission") DO NOTHING;
--> statement-breakpoint
INSERT INTO "module_permissions" ("member_module_id", "permission", "status")
SELECT mm."id", 'incluir_ordem_servico', 'ALLOW'
FROM "member_modules" mm
JOIN "modules" m ON m."id" = mm."module_id"
WHERE m."reference" = 'administrador'
  AND mm."access_level" IN ('N3', 'N4', 'N5', 'N6')
  AND mm."status" = 'ATIVO'
  AND mm."deleted_at" IS NULL
ON CONFLICT ("member_module_id", "permission") DO NOTHING;
--> statement-breakpoint
INSERT INTO "module_permissions" ("member_module_id", "permission", "status")
SELECT mm."id", 'alterar_ordem_servico', 'ALLOW'
FROM "member_modules" mm
JOIN "modules" m ON m."id" = mm."module_id"
WHERE m."reference" = 'administrador'
  AND mm."access_level" IN ('N4', 'N5', 'N6')
  AND mm."status" = 'ATIVO'
  AND mm."deleted_at" IS NULL
ON CONFLICT ("member_module_id", "permission") DO NOTHING;
