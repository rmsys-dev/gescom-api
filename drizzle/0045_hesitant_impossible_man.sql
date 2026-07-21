DO $$ BEGIN
  CREATE TYPE "public"."fuel_type" AS ENUM('GASOLINA', 'ALCOOL', 'DIESEL', 'ELETRICO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."owner_type" AS ENUM('PROPRIETARIO', 'LOCATARIO', 'OUTROS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."vehicle_type" AS ENUM('TRUCK', 'TOCO', 'CAVALO MECANICO', 'VAN', 'UTILITARIO', 'OUTROS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."body_type" AS ENUM('NAO_APLICAVEL', 'ABERTA', 'FECHADA/BAU', 'GRANELERA', 'PORTA CONTAINER', 'SIDER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."axle_type" AS ENUM('VEICULO 2 EIXOS', 'VEICULO 3 EIXOS', 'VEICULO 4 EIXOS', 'VEICULO 5 EIXOS', 'VEICULO 6 EIXOS', 'VEICULO 7 EIXOS', 'VEICULO 8 EIXOS', 'VEICULO 9 EIXOS', 'VEICULO 10 EIXOS', 'VEICULO ACIMA 10 EIXOS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enterprises_member_sales_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enterprises_members_id" uuid NOT NULL,
	"sales_items_id" uuid NOT NULL,
	"comission_service" numeric(15, 10) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plate" varchar(255) NOT NULL,
	"model" varchar(255) NOT NULL,
	"color" varchar(255) NOT NULL,
	"fuel_type" "fuel_type" DEFAULT 'GASOLINA' NOT NULL,
	"owner_type" "owner_type" DEFAULT 'PROPRIETARIO' NOT NULL,
	"ipva_payment_month" integer NOT NULL,
	"vehicle_year" integer NOT NULL,
	"renavam" varchar(255) NOT NULL,
	"licensing_state_id" uuid NOT NULL,
	"tare_weight" numeric(15, 4),
	"capacity_m3" numeric(15, 4),
	"capacity_kg" numeric(15, 4),
	"entire_code" varchar(255) NOT NULL,
	"rntrc_code" varchar(255) NOT NULL,
	"vehicle_type" "vehicle_type" DEFAULT 'TRUCK' NOT NULL,
	"body_type" "body_type" DEFAULT 'NAO_APLICAVEL' NOT NULL,
	"axle_type" "axle_type" DEFAULT 'VEICULO 2 EIXOS' NOT NULL,
	"location" varchar(255) NOT NULL,
	"refueling_mileage" numeric(15, 4),
	"fleet_number" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicles_enterprises_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"vehicles_id" uuid NOT NULL,
	"enterprises_members_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "enterprises_member_sales_items" ADD CONSTRAINT "enterprises_member_sales_items_enterprises_members_id_enterprises_members_id_fk" FOREIGN KEY ("enterprises_members_id") REFERENCES "public"."enterprises_members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "enterprises_member_sales_items" ADD CONSTRAINT "enterprises_member_sales_items_sales_items_id_sales_items_id_fk" FOREIGN KEY ("sales_items_id") REFERENCES "public"."sales_items"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_licensing_state_id_states_id_fk" FOREIGN KEY ("licensing_state_id") REFERENCES "public"."states"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "vehicles_enterprises_members" ADD CONSTRAINT "vehicles_enterprises_members_vehicles_id_vehicles_id_fk" FOREIGN KEY ("vehicles_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "vehicles_enterprises_members" ADD CONSTRAINT "vehicles_enterprises_members_enterprises_members_id_enterprises_members_id_fk" FOREIGN KEY ("enterprises_members_id") REFERENCES "public"."enterprises_members"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "enterprises_member_sales_items_unique" ON "enterprises_member_sales_items" USING btree ("enterprises_members_id","sales_items_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "vehicles_plate_unique" ON "vehicles" USING btree ("plate");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "vehicles_enterprises_members_unique" ON "vehicles_enterprises_members" USING btree ("vehicles_id","enterprises_members_id") WHERE "vehicles_enterprises_members"."status" = 'ATIVO';
