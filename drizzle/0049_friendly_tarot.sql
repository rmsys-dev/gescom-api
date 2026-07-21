DROP INDEX "vehicles_enterprises_members_unique";--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "service_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "service_type" DROP NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_enterprises_members_unique" ON "vehicles_enterprises_members" USING btree ("vehicles_id","enterprises_members_id") WHERE "vehicles_enterprises_members"."status" = 'ATIVO';