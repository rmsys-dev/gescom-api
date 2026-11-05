-- lint-approved: ban-concurrent-index-creation-in-transaction excecao revisada pelo code owner
CREATE INDEX CONCURRENTLY "users_email_idx" ON "public"."users" ("email");
