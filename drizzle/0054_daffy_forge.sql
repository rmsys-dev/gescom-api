ALTER TABLE "vehicles" ALTER COLUMN "vehicle_type" SET DEFAULT 'TRUCK';--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "body_type" SET DEFAULT 'NAO_APLICAVEL';--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "axle_type" SET DEFAULT 'VEICULO 2 EIXOS';--> statement-breakpoint

--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "vehicle_mileage" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "vehicle_mileage" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "observations" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "observations" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "defect" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "defect" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "service_type" SET DEFAULT 'SERVICO';--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "service_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "model" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "color" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "ipva_payment_month" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "vehicle_year" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "renavam" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "licensing_state_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "entire_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "rntrc_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "vehicles" ALTER COLUMN "location" DROP NOT NULL;--> statement-breakpoint