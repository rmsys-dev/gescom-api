ALTER TABLE "users_personal_info" ALTER COLUMN "gender" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."gender";--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('FEMININO', 'MASCULINO', 'NAO_INFORMADO');--> statement-breakpoint
ALTER TABLE "users_personal_info" ALTER COLUMN "gender" SET DATA TYPE "public"."gender" USING "gender"::"public"."gender";