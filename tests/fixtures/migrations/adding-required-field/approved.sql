-- lint-approved: adding-required-field excecao revisada pelo code owner
ALTER TABLE "public"."users" ADD COLUMN "email" text NOT NULL;
