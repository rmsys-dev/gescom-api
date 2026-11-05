ALTER TABLE "public"."users" ADD CONSTRAINT "users_email_key" UNIQUE USING INDEX "users_email_idx";
