-- Invalida convites de aceite de vinculo (fluxo removido; permanece apenas first-access).
UPDATE "user_invitations"
SET "deleted_at" = now(),
    "updated_at" = now()
WHERE "purpose" = 'MEMBERSHIP_ACCEPT'
  AND "consumed_at" IS NULL
  AND "deleted_at" IS NULL;
