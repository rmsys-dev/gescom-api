DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'MODULES';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'MEMBER_MODULES';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TYPE "public"."entity_type" ADD VALUE IF NOT EXISTS 'MODULE_PERMISSIONS';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "modules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(120) NOT NULL,
  "description" varchar(255),
  "status" "status" DEFAULT 'ATIVO' NOT NULL,
  "reference" varchar(255) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "modules_name_active_unique"
  ON "modules" USING btree ("name")
  WHERE "modules"."deleted_at" is null;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "modules_reference_active_unique"
  ON "modules" USING btree ("reference")
  WHERE "modules"."deleted_at" is null;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "member_modules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "module_id" uuid NOT NULL,
  "member_id" uuid NOT NULL,
  "access_level" "access_level" DEFAULT 'N0' NOT NULL,
  "status" "status" DEFAULT 'ATIVO' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone
);--> statement-breakpoint

ALTER TABLE "member_modules" DROP CONSTRAINT IF EXISTS "member_modules_module_id_modules_id_fk";--> statement-breakpoint
ALTER TABLE "member_modules" ADD CONSTRAINT "member_modules_module_id_modules_id_fk"
  FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "member_modules" DROP CONSTRAINT IF EXISTS "member_modules_member_id_enterprises_members_id_fk";--> statement-breakpoint
ALTER TABLE "member_modules" ADD CONSTRAINT "member_modules_member_id_enterprises_members_id_fk"
  FOREIGN KEY ("member_id") REFERENCES "public"."enterprises_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "member_modules_member_id_module_id_active_unique"
  ON "member_modules" USING btree ("member_id","module_id")
  WHERE "member_modules"."deleted_at" is null;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "module_permissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "member_module_id" uuid NOT NULL,
  "permission" varchar(255) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "module_permissions" DROP CONSTRAINT IF EXISTS "module_permissions_member_module_id_member_modules_id_fk";--> statement-breakpoint
ALTER TABLE "module_permissions" ADD CONSTRAINT "module_permissions_member_module_id_member_modules_id_fk"
  FOREIGN KEY ("member_module_id") REFERENCES "public"."member_modules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "module_permissions_member_module_permission_unique"
  ON "module_permissions" USING btree ("member_module_id","permission");--> statement-breakpoint

ALTER TABLE "sales_members" DROP COLUMN IF EXISTS "member_sector";--> statement-breakpoint

DROP TABLE IF EXISTS "member_extra_permissions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "member_permissions_default" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "members_departments" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "department_default_permissions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "departments" CASCADE;
