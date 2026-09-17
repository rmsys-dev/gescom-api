CREATE TABLE "enterprises_logos" (
	"enterprise_id" uuid PRIMARY KEY NOT NULL,
	"mime" varchar(64) NOT NULL,
	"bytes" bytea NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "enterprises_logos" ADD CONSTRAINT "enterprises_logos_enterprise_id_enterprises_id_fk" FOREIGN KEY ("enterprise_id") REFERENCES "public"."enterprises"("id") ON DELETE restrict ON UPDATE no action;