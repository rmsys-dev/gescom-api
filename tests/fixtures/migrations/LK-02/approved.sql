-- lint-approved: LK-02 excecao revisada pelo code owner
ALTER TABLE "public"."users" ADD COLUMN "total" integer GENERATED ALWAYS AS (1) STORED;
