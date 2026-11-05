-- lint-approved: adding-serial-primary-key-field excecao revisada pelo code owner
ALTER TABLE "public"."users" ADD COLUMN "id" serial PRIMARY KEY;
