DO $$ BEGIN
  ALTER TYPE "public"."status" ADD VALUE 'FUNCIONARIO';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DROP INDEX IF EXISTS "members_contact_principal_active_unique";--> statement-breakpoint
ALTER TABLE "members_contact" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."type_user_contact";--> statement-breakpoint
CREATE TYPE "public"."type_user_contact" AS ENUM('SECUNDARIO', 'PRINCIPAL', 'TRABALHO', 'RESIDENCIAL', 'COMERCIAL', 'CONJUGE', 'FILHO', 'PAI', 'MAE', 'OUTRO');--> statement-breakpoint
ALTER TABLE "members_contact" ALTER COLUMN "type" SET DATA TYPE "public"."type_user_contact" USING "type"::"public"."type_user_contact";--> statement-breakpoint
CREATE UNIQUE INDEX "members_contact_principal_active_unique" ON "members_contact" USING btree ("member_id") WHERE "members_contact"."deleted_at" is null and "members_contact"."type" = 'PRINCIPAL';
