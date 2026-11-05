ALTER TABLE "public"."users" ADD CONSTRAINT "users_email_nn" CHECK ("email" IS NOT NULL) NOT VALID;
