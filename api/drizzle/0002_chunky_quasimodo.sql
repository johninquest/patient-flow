ALTER TABLE "patients" ALTER COLUMN "address" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "identity" jsonb;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "financials" jsonb;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "emergency_contact" jsonb;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "medical_history" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "medical_history_date" timestamp;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "physicians" jsonb;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "transport_logistics" jsonb;