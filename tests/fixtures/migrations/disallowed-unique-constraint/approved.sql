-- lint-approved: disallowed-unique-constraint excecao revisada pelo code owner
ALTER TABLE "public"."users" ADD CONSTRAINT "users_email_key" UNIQUE ("email");
