ALTER TABLE "users_relationships" ALTER COLUMN "housing_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."housing_type";--> statement-breakpoint
CREATE TYPE "public"."housing_type" AS ENUM('ALUGADO', 'PROPRIO', 'DOADO', 'EMPRESTADO', 'OUTRO');--> statement-breakpoint
ALTER TABLE "users_relationships" ALTER COLUMN "housing_type" SET DATA TYPE "public"."housing_type" USING "housing_type"::"public"."housing_type";