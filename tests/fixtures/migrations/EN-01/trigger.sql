ALTER TYPE "public"."status" ADD VALUE 'NEW';
INSERT INTO "public"."users" ("status") VALUES ('NEW');
