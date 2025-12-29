ALTER TABLE "user_access" ALTER COLUMN "user" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_access" ADD COLUMN "pending_email" text;--> statement-breakpoint
ALTER TABLE "user_access" ADD CONSTRAINT "user_access_pending_email_property_unique" UNIQUE NULLS NOT DISTINCT("pending_email","property");--> statement-breakpoint
ALTER TABLE "user_access" ADD CONSTRAINT "user_access_user_or_pending" CHECK (("user_access"."user" IS NOT NULL AND "user_access"."pending_email" IS NULL) OR ("user_access"."user" IS NULL AND "user_access"."pending_email" IS NOT NULL));