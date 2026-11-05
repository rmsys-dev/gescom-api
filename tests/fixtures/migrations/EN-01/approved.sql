-- lint-approved: EN-01 excecao revisada pelo code owner
ALTER TYPE "public"."status" ADD VALUE 'NEW';
INSERT INTO "public"."users" ("status") VALUES ('NEW');
