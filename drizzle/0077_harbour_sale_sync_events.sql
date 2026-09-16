-- Fila de sincronizacao Harbour (DBF/CDX). Sem payload da venda.

DO $$ BEGIN
  CREATE TYPE "public"."harbour_sale_sync_event_type" AS ENUM (
    'SALE_FINALIZED',
    'SALE_CANCELLED',
    'OS_FINALIZED',
    'OS_CANCELLED',
    'OS_CONVERTED_TO_SALE',
    'OS_ESTORNO',
    'SALE_RETURNED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  CREATE TYPE "public"."harbour_sale_sync_status" AS ENUM (
    'PENDING',
    'PROCESSING',
    'DONE',
    'ERROR'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "harbour_sale_sync_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "enterprises_id" uuid NOT NULL,
  "sale_id" uuid NOT NULL,
  "event_type" "public"."harbour_sale_sync_event_type" NOT NULL,
  "status" "public"."harbour_sale_sync_status" DEFAULT 'PENDING' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "last_error" varchar(500),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "processed_at" timestamp with time zone
);--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "harbour_sale_sync_events"
    ADD CONSTRAINT "harbour_sale_sync_events_enterprises_id_enterprises_id_fk"
    FOREIGN KEY ("enterprises_id") REFERENCES "public"."enterprises"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "harbour_sale_sync_events"
    ADD CONSTRAINT "harbour_sale_sync_events_sale_id_sales_id_fk"
    FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id")
    ON DELETE restrict ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "harbour_sale_sync_events_sale_id_idx"
  ON "harbour_sale_sync_events" USING btree ("sale_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "harbour_sale_sync_events_pending_idx"
  ON "harbour_sale_sync_events" USING btree ("enterprises_id", "created_at")
  WHERE "status" = 'PENDING';--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "harbour_sale_sync_events_pending_unique"
  ON "harbour_sale_sync_events" USING btree ("enterprises_id", "sale_id", "event_type")
  WHERE "status" = 'PENDING';
