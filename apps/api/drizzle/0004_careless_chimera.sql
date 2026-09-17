ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_actor_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_log" ALTER COLUMN "actor_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "actor_name" text;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "patient_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_log" ADD COLUMN "encounter_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_patient_idx" ON "audit_log" USING btree ("patient_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_encounter_idx" ON "audit_log" USING btree ("encounter_id","created_at");