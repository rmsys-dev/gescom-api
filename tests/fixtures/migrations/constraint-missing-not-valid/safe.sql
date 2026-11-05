ALTER TABLE "public"."users" ADD CONSTRAINT "users_email_ck" CHECK ("email" <> '') NOT VALID;
