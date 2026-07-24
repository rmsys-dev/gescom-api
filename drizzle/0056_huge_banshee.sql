CREATE TYPE "public"."type_service" AS ENUM('PROPRIO', 'OUTROS');--> statement-breakpoint
ALTER TABLE "sales_items" ADD COLUMN "type_service" "type_service" DEFAULT 'PROPRIO' NOT NULL;