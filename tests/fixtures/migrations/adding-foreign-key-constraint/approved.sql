-- lint-approved: adding-foreign-key-constraint excecao revisada pelo code owner
ALTER TABLE "public"."posts" ADD CONSTRAINT "posts_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id");
