ALTER TABLE "audit_logs" RENAME TO "activities";--> statement-breakpoint
ALTER TABLE "activities" DROP CONSTRAINT "audit_logs_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "activities" DROP CONSTRAINT "audit_logs_property_id_properties_id_fk";
--> statement-breakpoint
DROP INDEX "audit_logs_property_idx";--> statement-breakpoint
DROP INDEX "audit_logs_entity_idx";--> statement-breakpoint
DROP INDEX "audit_logs_user_idx";--> statement-breakpoint
DROP INDEX "audit_logs_created_at_idx";--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_property_idx" ON "activities" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "activities_entity_idx" ON "activities" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "activities_user_idx" ON "activities" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activities_created_at_idx" ON "activities" USING btree ("created_at");