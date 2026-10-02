INSERT INTO "enterprises_sequences" ("enterprise_id", "type", "sequence")
SELECT "enterprise_id", 'MEMBRO', max("code")
FROM "enterprises_members"
WHERE "code" IS NOT NULL AND "deleted_at" IS NULL
GROUP BY "enterprise_id"
ON CONFLICT ("enterprise_id", "type") WHERE "deleted_at" IS NULL
DO UPDATE SET "sequence" = greatest("enterprises_sequences"."sequence", EXCLUDED."sequence"), "updated_at" = now();
--> statement-breakpoint
INSERT INTO "enterprises_sequences" ("enterprise_id", "type", "sequence")
SELECT "enterprises_id", 'PRODUTO', max("code")
FROM "products_enterprises"
WHERE "code" IS NOT NULL
GROUP BY "enterprises_id"
ON CONFLICT ("enterprise_id", "type") WHERE "deleted_at" IS NULL
DO UPDATE SET "sequence" = greatest("enterprises_sequences"."sequence", EXCLUDED."sequence"), "updated_at" = now();
