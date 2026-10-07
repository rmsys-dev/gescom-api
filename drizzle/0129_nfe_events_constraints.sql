CREATE UNIQUE INDEX IF NOT EXISTS "nfe_events_header_type_seq_unique" ON "nfe_events" ("nfe_header_id","event_type","n_seq_evento") WHERE "nfe_header_id" is not null;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_events" ADD CONSTRAINT "nfe_events_header_chk" CHECK (("event_type" = 'INUTILIZACAO' and "nfe_header_id" is null) or ("event_type" <> 'INUTILIZACAO' and "nfe_header_id" is not null));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_events" ADD CONSTRAINT "nfe_events_seq_chk" CHECK ("n_seq_evento" >= 1 and "n_seq_evento" <= 20);
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "nfe_events" ADD CONSTRAINT "nfe_events_chave_chk" CHECK ("chave" is null or "chave" ~ '^[0-9]{44}$');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
