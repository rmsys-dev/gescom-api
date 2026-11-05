-- lint-approved: adding-field-with-default excecao revisada pelo code owner
ALTER TABLE "public"."users" ADD COLUMN "token" text DEFAULT random();
