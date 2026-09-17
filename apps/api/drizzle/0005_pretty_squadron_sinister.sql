CREATE TABLE "clinical_note_revisions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"note_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"note_type" text NOT NULL,
	"subjective" text,
	"objective" text,
	"assessment" text,
	"plan" text,
	"additional_notes" text,
	"edited_by" text,
	"edited_by_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_notes" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"patient_id" uuid NOT NULL,
	"encounter_id" uuid NOT NULL,
	"note_type" text DEFAULT 'consultation' NOT NULL,
	"subjective" text,
	"objective" text,
	"assessment" text,
	"plan" text,
	"additional_notes" text,
	"author_user_id" text,
	"author_name" text,
	"author_role" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_problems" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"patient_id" uuid NOT NULL,
	"encounter_id" uuid,
	"description" text NOT NULL,
	"code" text,
	"code_system" text,
	"diagnosis_slug" text,
	"status" text DEFAULT 'active' NOT NULL,
	"onset_date" timestamp,
	"resolved_date" timestamp,
	"recorded_by" text,
	"recorded_by_name" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clinical_note_revisions" ADD CONSTRAINT "clinical_note_revisions_note_id_clinical_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."clinical_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_note_revisions" ADD CONSTRAINT "clinical_note_revisions_edited_by_user_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_problems" ADD CONSTRAINT "patient_problems_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_problems" ADD CONSTRAINT "patient_problems_encounter_id_encounters_id_fk" FOREIGN KEY ("encounter_id") REFERENCES "public"."encounters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_problems" ADD CONSTRAINT "patient_problems_recorded_by_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clinical_note_revisions_note_idx" ON "clinical_note_revisions" USING btree ("note_id","revision_number");--> statement-breakpoint
CREATE INDEX "clinical_notes_patient_idx" ON "clinical_notes" USING btree ("patient_id","created_at");--> statement-breakpoint
CREATE INDEX "clinical_notes_encounter_idx" ON "clinical_notes" USING btree ("encounter_id","created_at");--> statement-breakpoint
CREATE INDEX "patient_problems_patient_idx" ON "patient_problems" USING btree ("patient_id","status");