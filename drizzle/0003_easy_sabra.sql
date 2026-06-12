CREATE TYPE "public"."type_classification_customers" AS ENUM('TODOS', 'CLIENTE', 'FORNECEDOR');--> statement-breakpoint
CREATE TABLE "type_supplier_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"description" varchar(255) NOT NULL,
	"icms_reduction" numeric(13, 10),
	"low" boolean DEFAULT false NOT NULL,
	"generates_st" boolean DEFAULT false NOT NULL,
	"end_consumer" boolean DEFAULT false NOT NULL,
	"classification" "type_classification_customers" DEFAULT 'CLIENTE' NOT NULL,
	"benefit_code" varchar(255),
	"customer_discount" numeric(13, 10),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD COLUMN "type_supplier_customer_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "type_supplier_customers_description_active_unique" ON "type_supplier_customers" USING btree ("description");--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_type_supplier_customer_id_type_supplier_customers_id_fk" FOREIGN KEY ("type_supplier_customer_id") REFERENCES "public"."type_supplier_customers"("id") ON DELETE restrict ON UPDATE no action;