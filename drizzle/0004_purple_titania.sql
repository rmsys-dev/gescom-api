CREATE TABLE "type_networks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" varchar(255) NOT NULL,
	"status" "status" DEFAULT 'ATIVO' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD COLUMN "type_network_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "type_networks_description_active_unique" ON "type_networks" USING btree ("description");--> statement-breakpoint
ALTER TABLE "enterprises_members" ADD CONSTRAINT "enterprises_members_type_network_id_type_networks_id_fk" FOREIGN KEY ("type_network_id") REFERENCES "public"."type_networks"("id") ON DELETE restrict ON UPDATE no action;