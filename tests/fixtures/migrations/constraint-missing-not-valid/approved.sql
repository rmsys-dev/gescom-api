-- lint-approved: constraint-missing-not-valid excecao revisada pelo code owner
ALTER TABLE "public"."users" ADD CONSTRAINT "users_email_ck" CHECK ("email" <> '');
