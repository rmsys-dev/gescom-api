ALTER TABLE "users_relationships" ADD COLUMN "rental_price" numeric(15, 2);--> statement-breakpoint
ALTER TABLE "enterprises_members" DROP COLUMN "rental_price";