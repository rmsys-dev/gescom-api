-- module_permissions.status passa do enum genérico `status` (ATIVO/INATIVO)
-- para `status_permission` (ALLOW/DENIED).
DO $$ BEGIN
  CREATE TYPE "public"."status_permission" AS ENUM ('ALLOW', 'DENIED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'module_permissions'
      AND column_name = 'status'
      AND udt_name = 'status'
  ) THEN
    ALTER TABLE "module_permissions" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "module_permissions"
      ALTER COLUMN "status" TYPE "status_permission"
      USING (
        CASE "status"::text
          WHEN 'ATIVO' THEN 'ALLOW'
          WHEN 'INATIVO' THEN 'DENIED'
          WHEN 'ALLOW' THEN 'ALLOW'
          WHEN 'DENIED' THEN 'DENIED'
          ELSE 'ALLOW'
        END
      )::"status_permission";
    ALTER TABLE "module_permissions"
      ALTER COLUMN "status" SET DEFAULT 'ALLOW'::"status_permission";
  END IF;
END $$;
