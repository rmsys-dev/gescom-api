-- lint-approved: DL-05 excecao revisada pelo code owner
ALTER TABLE "public"."users" ALTER COLUMN "email" TYPE varchar(100) USING "email"::varchar;
