-- lint-approved: LK-05 excecao revisada pelo code owner
ALTER TABLE "public"."users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "public"."products" ALTER COLUMN "name" SET NOT NULL;
