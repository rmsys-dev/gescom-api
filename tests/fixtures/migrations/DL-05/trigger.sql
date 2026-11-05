ALTER TABLE "public"."users" ALTER COLUMN "email" TYPE varchar(100) USING "email"::varchar;
