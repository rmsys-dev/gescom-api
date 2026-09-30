DROP INDEX IF EXISTS "type_supplier_customers_description_active_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "type_networks_description_active_unique";
--> statement-breakpoint
ALTER TABLE "type_supplier_customers" DROP COLUMN IF EXISTS "benefit_code";
--> statement-breakpoint
ALTER TABLE "type_supplier_customers" ADD COLUMN IF NOT EXISTS "enterprise_id" uuid;
--> statement-breakpoint
ALTER TABLE "type_networks" ADD COLUMN IF NOT EXISTS "enterprise_id" uuid;
--> statement-breakpoint
DO $$
DECLARE
  r record;
  new_id uuid;
BEGIN
  FOR r IN
    WITH pairs AS (
      SELECT DISTINCT m.type_supplier_customer_id AS type_id, m.enterprise_id
      FROM "enterprises_members" m
      WHERE m.type_supplier_customer_id IS NOT NULL
      UNION
      SELECT t.id, e.id
      FROM "type_supplier_customers" t
      CROSS JOIN "enterprises" e
      WHERE e.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "enterprises_members" m WHERE m.type_supplier_customer_id = t.id
        )
    )
    SELECT p.type_id, p.enterprise_id,
      row_number() OVER (PARTITION BY p.type_id ORDER BY p.enterprise_id) AS rn
    FROM pairs p
    JOIN "type_supplier_customers" t ON t.id = p.type_id
    WHERE t.enterprise_id IS NULL
  LOOP
    IF r.rn = 1 THEN
      UPDATE "type_supplier_customers" SET enterprise_id = r.enterprise_id WHERE id = r.type_id;
    ELSE
      INSERT INTO "type_supplier_customers" (
        enterprise_id, status, description, icms_reduction, low, generates_st,
        end_consumer, classification, customer_discount, created_at, updated_at
      )
      SELECT r.enterprise_id, status, description, icms_reduction, low, generates_st,
        end_consumer, classification, customer_discount, created_at, updated_at
      FROM "type_supplier_customers" WHERE id = r.type_id
      RETURNING id INTO new_id;
      UPDATE "enterprises_members"
        SET type_supplier_customer_id = new_id
        WHERE type_supplier_customer_id = r.type_id AND enterprise_id = r.enterprise_id;
    END IF;
  END LOOP;
  DELETE FROM "type_supplier_customers" WHERE enterprise_id IS NULL;
END $$;
--> statement-breakpoint
DO $$
DECLARE
  r record;
  new_id uuid;
BEGIN
  FOR r IN
    WITH pairs AS (
      SELECT DISTINCT m.type_network_id AS type_id, m.enterprise_id
      FROM "enterprises_members" m
      WHERE m.type_network_id IS NOT NULL
      UNION
      SELECT t.id, e.id
      FROM "type_networks" t
      CROSS JOIN "enterprises" e
      WHERE e.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "enterprises_members" m WHERE m.type_network_id = t.id
        )
    )
    SELECT p.type_id, p.enterprise_id,
      row_number() OVER (PARTITION BY p.type_id ORDER BY p.enterprise_id) AS rn
    FROM pairs p
    JOIN "type_networks" t ON t.id = p.type_id
    WHERE t.enterprise_id IS NULL
  LOOP
    IF r.rn = 1 THEN
      UPDATE "type_networks" SET enterprise_id = r.enterprise_id WHERE id = r.type_id;
    ELSE
      INSERT INTO "type_networks" (enterprise_id, description, status, created_at, updated_at)
      SELECT r.enterprise_id, description, status, created_at, updated_at
      FROM "type_networks" WHERE id = r.type_id
      RETURNING id INTO new_id;
      UPDATE "enterprises_members"
        SET type_network_id = new_id
        WHERE type_network_id = r.type_id AND enterprise_id = r.enterprise_id;
    END IF;
  END LOOP;
  DELETE FROM "type_networks" WHERE enterprise_id IS NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "type_supplier_customers" ALTER COLUMN "enterprise_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "type_networks" ALTER COLUMN "enterprise_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "type_supplier_customers" ADD CONSTRAINT "type_supplier_customers_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "type_networks" ADD CONSTRAINT "type_networks_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "type_supplier_customers_enterprise_description_unique" ON "type_supplier_customers" ("enterprise_id", "description");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "type_networks_enterprise_description_unique" ON "type_networks" ("enterprise_id", "description");
