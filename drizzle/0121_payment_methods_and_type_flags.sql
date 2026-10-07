DO $$ BEGIN
  CREATE TYPE "public"."payment_method_type" AS ENUM('1', '2', '3', '4', '5');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."payment_method_integration" AS ENUM('0', '1', '2');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'PAYMENT_METHODS';
--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'TYPE_FLAGS';
--> statement-breakpoint
ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'PAYMENT_TYPES_METHODS_FLAGS';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_methods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "status" "status" DEFAULT 'ATIVO' NOT NULL,
  "payment_code" varchar(255) NOT NULL,
  "description" varchar(255) NOT NULL,
  "type" "payment_method_type" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "payment_methods" DROP COLUMN IF EXISTS "sped1601";
--> statement-breakpoint
ALTER TABLE "payment_methods" DROP COLUMN IF EXISTS "generate_charge";
--> statement-breakpoint
ALTER TABLE "payment_methods" DROP COLUMN IF EXISTS "integration";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "payment_methods_payment_code_unique" ON "payment_methods" ("payment_code");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "type_flags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "status" "status" DEFAULT 'ATIVO' NOT NULL,
  "flag_code" varchar(255) NOT NULL,
  "description" varchar(255) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "type_flags_flag_code_unique" ON "type_flags" ("flag_code");
--> statement-breakpoint
ALTER TABLE "payment_types" DROP CONSTRAINT IF EXISTS "payment_types_payment_methods_id_payment_methods_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_types" DROP CONSTRAINT IF EXISTS "payment_types_type_flags_id_type_flags_id_fk";
--> statement-breakpoint
ALTER TABLE "payment_types" DROP COLUMN IF EXISTS "payment_methods_id";
--> statement-breakpoint
ALTER TABLE "payment_types" DROP COLUMN IF EXISTS "type_flags_id";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_types_methods_flags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprises_id" uuid NOT NULL,
  "payment_methods_id" uuid NOT NULL,
  "payment_types_id" uuid NOT NULL,
  "type_flags_id" uuid,
  "status" "status" DEFAULT 'ATIVO' NOT NULL,
  "sped1601" boolean DEFAULT false NOT NULL,
  "generate_charge" boolean DEFAULT false NOT NULL,
  "integration" "payment_method_integration" NOT NULL,
  "band_member_id" uuid,
  "intermediary_member_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "payment_types_methods_flags" ADD CONSTRAINT "ptmf_enterprises_id_enterprises_id_fk" FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "payment_types_methods_flags" ADD CONSTRAINT "ptmf_payment_methods_id_payment_methods_id_fk" FOREIGN KEY ("payment_methods_id") REFERENCES "public"."payment_methods"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "payment_types_methods_flags" ADD CONSTRAINT "ptmf_payment_types_id_payment_types_id_fk" FOREIGN KEY ("payment_types_id") REFERENCES "public"."payment_types"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "payment_types_methods_flags" ADD CONSTRAINT "ptmf_type_flags_id_type_flags_id_fk" FOREIGN KEY ("type_flags_id") REFERENCES "public"."type_flags"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "payment_types_methods_flags" ADD CONSTRAINT "ptmf_band_member_id_enterprises_members_id_fk" FOREIGN KEY ("band_member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "payment_types_methods_flags" ADD CONSTRAINT "ptmf_intermediary_member_id_enterprises_members_id_fk" FOREIGN KEY ("intermediary_member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ptmf_enterprise_combo_flag_unique" ON "payment_types_methods_flags" ("enterprises_id", "payment_types_id", "payment_methods_id", "type_flags_id") WHERE "type_flags_id" is not null;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ptmf_enterprise_combo_no_flag_unique" ON "payment_types_methods_flags" ("enterprises_id", "payment_types_id", "payment_methods_id") WHERE "type_flags_id" is null;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ptmf_enterprises_id_idx" ON "payment_types_methods_flags" ("enterprises_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ptmf_band_member_id_idx" ON "payment_types_methods_flags" ("band_member_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ptmf_intermediary_member_id_idx" ON "payment_types_methods_flags" ("intermediary_member_id");
--> statement-breakpoint
ALTER TABLE "sales_payments" ADD COLUMN IF NOT EXISTS "payment_types_methods_flags_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_ptmf_id_fk" FOREIGN KEY ("payment_types_methods_flags_id") REFERENCES "public"."payment_types_methods_flags"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "nfe_payments" ADD COLUMN IF NOT EXISTS "payment_types_methods_flags_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_payments" ADD CONSTRAINT "nfe_payments_ptmf_id_fk" FOREIGN KEY ("payment_types_methods_flags_id") REFERENCES "public"."payment_types_methods_flags"("id") ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
