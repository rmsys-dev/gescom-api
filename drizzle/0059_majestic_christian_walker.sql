DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.product_taxation'::regclass
      AND c.contype = 'f'
      AND a.attname = 'products_enterprises_id'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.product_taxation DROP CONSTRAINT IF EXISTS %I',
      constraint_name
    );
  END LOOP;
END $$;
--> statement-breakpoint
DROP INDEX IF EXISTS "product_taxation_products_enterprises_id_unique";--> statement-breakpoint
ALTER TABLE "user_invitations" ALTER COLUMN "expires_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_invitations" ALTER COLUMN "consumed_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD COLUMN IF NOT EXISTS "approved_by" uuid;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD COLUMN IF NOT EXISTS "product_pis_cofins_situation_id" uuid;--> statement-breakpoint
ALTER TABLE "products_enterprises" ADD COLUMN IF NOT EXISTS "product_taxation_id" uuid;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_taxation'
      AND column_name = 'products_enterprises_id'
  ) THEN
    UPDATE public.products_enterprises pe
    SET product_taxation_id = canonical.id
    FROM public.product_taxation pt
    INNER JOIN (
      SELECT DISTINCT ON (
        cst_pis_entrada_id,
        cst_pis_saida_id,
        cst_cofins_entrada_id,
        cst_cofins_saida_id,
        icms_taxation_id
      )
        id,
        cst_pis_entrada_id,
        cst_pis_saida_id,
        cst_cofins_entrada_id,
        cst_cofins_saida_id,
        icms_taxation_id
      FROM public.product_taxation
      ORDER BY
        cst_pis_entrada_id,
        cst_pis_saida_id,
        cst_cofins_entrada_id,
        cst_cofins_saida_id,
        icms_taxation_id,
        created_at NULLS LAST,
        id
    ) canonical
      ON canonical.cst_pis_entrada_id = pt.cst_pis_entrada_id
     AND canonical.cst_pis_saida_id = pt.cst_pis_saida_id
     AND canonical.cst_cofins_entrada_id = pt.cst_cofins_entrada_id
     AND canonical.cst_cofins_saida_id = pt.cst_cofins_saida_id
     AND canonical.icms_taxation_id = pt.icms_taxation_id
    WHERE pt.products_enterprises_id = pe.id
      AND pe.product_taxation_id IS NULL;

    UPDATE public.products_enterprises pe
    SET product_pis_cofins_situation_id = pt.cst_pis_saida_id
    FROM public.product_taxation pt
    WHERE pt.products_enterprises_id = pe.id
      AND pe.product_pis_cofins_situation_id IS NULL;
  END IF;
END $$;
--> statement-breakpoint
UPDATE public.products_enterprises pe
SET product_taxation_id = canonical.id
FROM public.product_taxation pt
INNER JOIN (
  SELECT DISTINCT ON (
    cst_pis_entrada_id,
    cst_pis_saida_id,
    cst_cofins_entrada_id,
    cst_cofins_saida_id,
    icms_taxation_id
  )
    id,
    cst_pis_entrada_id,
    cst_pis_saida_id,
    cst_cofins_entrada_id,
    cst_cofins_saida_id,
    icms_taxation_id
  FROM public.product_taxation
  ORDER BY
    cst_pis_entrada_id,
    cst_pis_saida_id,
    cst_cofins_entrada_id,
    cst_cofins_saida_id,
    icms_taxation_id,
    created_at NULLS LAST,
    id
) canonical
  ON canonical.cst_pis_entrada_id = pt.cst_pis_entrada_id
 AND canonical.cst_pis_saida_id = pt.cst_pis_saida_id
 AND canonical.cst_cofins_entrada_id = pt.cst_cofins_entrada_id
 AND canonical.cst_cofins_saida_id = pt.cst_cofins_saida_id
 AND canonical.icms_taxation_id = pt.icms_taxation_id
WHERE pe.product_taxation_id = pt.id
  AND pe.product_taxation_id IS DISTINCT FROM canonical.id;
--> statement-breakpoint
DELETE FROM public.product_taxation pt
WHERE NOT EXISTS (
  SELECT 1
  FROM (
    SELECT DISTINCT ON (
      cst_pis_entrada_id,
      cst_pis_saida_id,
      cst_cofins_entrada_id,
      cst_cofins_saida_id,
      icms_taxation_id
    ) id
    FROM public.product_taxation
    ORDER BY
      cst_pis_entrada_id,
      cst_pis_saida_id,
      cst_cofins_entrada_id,
      cst_cofins_saida_id,
      icms_taxation_id,
      created_at NULLS LAST,
      id
  ) keep
  WHERE keep.id = pt.id
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.products_enterprises
    WHERE "product_pis_cofins_situation_id" IS NULL
  ) THEN
    ALTER TABLE "products_enterprises"
      ALTER COLUMN "product_pis_cofins_situation_id" SET NOT NULL;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.products_enterprises
    WHERE "product_taxation_id" IS NULL
  ) THEN
    ALTER TABLE "products_enterprises"
      ALTER COLUMN "product_taxation_id" SET NOT NULL;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_pis_cofins_situation_id_pis_cofins_situation_id_fk" FOREIGN KEY ("product_pis_cofins_situation_id") REFERENCES "public"."pis_cofins_situation"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "products_enterprises" ADD CONSTRAINT "products_enterprises_product_taxation_id_product_taxation_id_fk" FOREIGN KEY ("product_taxation_id") REFERENCES "public"."product_taxation"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS "product_taxation_cst_icms_unique"
    ON "product_taxation"
    USING btree (
      "cst_pis_entrada_id",
      "cst_pis_saida_id",
      "cst_cofins_entrada_id",
      "cst_cofins_saida_id",
      "icms_taxation_id"
    );
EXCEPTION
  WHEN unique_violation THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;--> statement-breakpoint
ALTER TABLE "product_taxation" DROP COLUMN IF EXISTS "products_enterprises_id";
