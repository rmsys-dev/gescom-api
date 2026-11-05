ALTER TABLE "public"."users" DROP COLUMN "email";
ALTER TABLE "public"."users" ADD COLUMN "mail" varchar(255);
