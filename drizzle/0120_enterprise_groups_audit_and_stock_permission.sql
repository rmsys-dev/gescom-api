ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'ENTERPRISE_GROUPS';
--> statement-breakpoint
INSERT INTO "module_permissions" ("member_module_id", "permission", "status")
SELECT mm."id", 'consultar_estoque_grupo', 'ALLOW'
FROM "member_modules" mm
JOIN "modules" m ON m."id" = mm."module_id"
WHERE m."reference" IN ('estoque', 'administrador')
  AND mm."access_level" <> 'N0'
  AND mm."deleted_at" IS NULL
ON CONFLICT ("member_module_id", "permission") DO NOTHING;
