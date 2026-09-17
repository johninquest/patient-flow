import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ============================================================================
// AUTH TABLES (Better Auth managed)
// ============================================================================

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').default(false),
  image: text('image'),
  // Defaults to 'pending', not 'front_desk': the default is the value a
  // self-service Google signup receives, and it must be the zero-access one.
  // 'pending' = authenticated but granted nothing (see core/auth/roles.ts).
  role: text('role').default('pending').notNull(), // 'pending' | 'admin' | 'provider' | 'clinical_staff' | 'front_desk'
  title: text('title'), // Professional designation: Doctor, Nurse, Medical Physicist, etc.
  status: text('status').default('active').notNull(), // 'active' | 'suspended'
  // --- Better Auth admin plugin columns (see core/auth/auth.ts) -------------
  // Required because the plugin validates its schema against this file at
  // startup. Only the ban columns are unused: Patient Flow suspends accounts
  // via `status` above, which AuthGuard enforces, so there is a single
  // suspend mechanism.
  banned: boolean('banned').default(false),
  banReason: text('banReason'),
  banExpires: timestamp('banExpires'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  // Set by the admin plugin when an admin impersonates a user. Unused by the
  // app, but required by the plugin's schema validation.
  impersonatedBy: text('impersonatedBy'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

// ============================================================================
// PATIENT FLOW TABLES
// ============================================================================

export const patients = pgTable(
  'patients',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    first_name: text('first_name').notNull(),
    last_name: text('last_name').notNull(),
    date_of_birth: timestamp('date_of_birth'),
    phone: text('phone'),
    email: text('email'),
    address: jsonb('address'), // { street, postal_code, city, country }
    identity: jsonb('identity'), // { document_type, country_national, scanned_document }
    financials: jsonb('financials'), // { health_insurance, reimbursement }
    emergency_contact: jsonb('emergency_contact'), // { name, relation, phone, email, comments }
    medical_history: text('medical_history'),
    medical_history_date: timestamp('medical_history_date'),
    physicians: jsonb('physicians'), // { attending, correspondent, other }
    transport_logistics: jsonb('transport_logistics'), // { modes: string[], comments } — modes is a subset of public_transport | taxi | ambulance
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index('patients_name_idx').on(table.last_name, table.first_name),
    emailIdx: index('patients_email_idx').on(table.email),
  }),
);

export const encounters = pgTable(
  'encounters',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    patient_id: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    status: text('status').notNull(), // 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled'
    phase: text('phase'), // 'consultation' | 'awaiting_lab' | 'awaiting_results' | 'treatment' | 'discharge' | null
    assigned_to: text('assigned_to').references(() => user.id, {
      onDelete: 'set null',
    }),
    scheduled_time: timestamp('scheduled_time'),
    notes: text('notes'),
    version: integer('version').default(0).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    patientIdx: index('encounters_patient_idx').on(table.patient_id),
    statusIdx: index('encounters_status_idx').on(table.status),
    phaseIdx: index('encounters_phase_idx').on(table.phase),
    assignedToIdx: index('encounters_assigned_to_idx').on(table.assigned_to),
    scheduledTimeIdx: index('encounters_scheduled_time_idx').on(
      table.scheduled_time,
    ),
  }),
);

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    encounter_id: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull(), // 'todo' | 'in_progress' | 'done'
    priority: text('priority').notNull(), // 'low' | 'medium' | 'high'
    assigned_user_id: text('assigned_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    assigned_role: text('assigned_role'),
    blocking: boolean('blocking').default(false).notNull(),
    due_at: timestamp('due_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    encounterIdx: index('tasks_encounter_idx').on(table.encounter_id),
    statusIdx: index('tasks_status_idx').on(table.status),
    assignedUserIdIdx: index('tasks_assigned_user_idx').on(
      table.assigned_user_id,
    ),
    priorityIdx: index('tasks_priority_idx').on(table.priority),
  }),
);

export const audit_log = pgTable(
  'audit_log',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    // Nullable with `set null` rather than `notNull` + `cascade`: cascading a
    // staff deletion into `audit_log` would erase that person's entire history,
    // which is the opposite of what an audit trail is for.
    actor_user_id: text('actor_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    // Snapshot of the actor's name at write time. Kept alongside the id so a
    // timeline stays readable after a rename, and for actors the client cannot
    // resolve (suspended or deleted accounts are absent from the assignable
    // staff list the timeline uses for name lookup).
    actor_name: text('actor_name'),
    actor_role: text('actor_role').notNull(),
    action: text('action').notNull(), // e.g., 'patient.created', 'encounter.status_changed'
    resource_type: text('resource_type').notNull(), // e.g., 'patient', 'encounter', 'task'
    // Polymorphic, so it cannot be `uuid`: it holds uuidv7 IDs for business
    // entities and Better Auth's nanoid text IDs for `user` resources. As
    // `uuid` every `user.*` audit entry failed at insert; because
    // AuditService.record() swallows errors, those failures were invisible.
    resource_id: text('resource_id').notNull(),
    // --- Denormalized scope (see docs/contracts/schema.md) -------------------
    // `resource_type`/`resource_id` name only the entity an action *targeted*,
    // so an encounter created for a patient is recorded as resource_type
    // 'encounter' and carries no reference to the patient. Without these columns
    // a query for one patient's history can never return their encounters or
    // tasks. Deliberately NOT foreign keys: audit rows must outlive the entities
    // they describe, and a cascade would erase history exactly when it matters.
    patient_id: uuid('patient_id'),
    encounter_id: uuid('encounter_id'),
    diff: jsonb('diff'), // { field: { from: value, to: value } }
    ip_address: text('ip_address'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    actorIdx: index('audit_log_actor_idx').on(table.actor_user_id),
    resourceIdx: index('audit_log_resource_idx').on(
      table.resource_type,
      table.resource_id,
    ),
    actionIdx: index('audit_log_action_idx').on(table.action),
    createdAtIdx: index('audit_log_created_at_idx').on(table.created_at),
    patientIdx: index('audit_log_patient_idx').on(
      table.patient_id,
      table.created_at,
    ),
    encounterIdx: index('audit_log_encounter_idx').on(
      table.encounter_id,
      table.created_at,
    ),
  }),
);

// ============================================================================
// CLINICAL DOCUMENTATION TABLES
// ============================================================================

/**
 * Clinical notes — the SOAP documentation of a visit.
 *
 * This is the "head" row holding current content. Superseded versions live in
 * `clinical_note_revisions`, so a note is editable without losing its history:
 * an edit snapshots the previous content into a revision and bumps `version`.
 *
 * `patient_id` is denormalized from the encounter so a patient's notes can be
 * read without joining through `encounters`. `encounter_id` is NOT NULL because
 * a note documents a visit — that is the whole point of the artifact.
 */
export const clinical_notes = pgTable(
  'clinical_notes',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    patient_id: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    encounter_id: uuid('encounter_id')
      .notNull()
      .references(() => encounters.id, { onDelete: 'cascade' }),
    note_type: text('note_type').default('consultation').notNull(), // 'consultation' | 'nursing' | 'procedure' | 'other'
    // SOAP structure. Every field is optional so a partial note can be saved
    // and completed later, but the structure is what makes assessment (the
    // diagnosis narrative) and plan (the treatment plan) addressable.
    subjective: text('subjective'),
    objective: text('objective'),
    assessment: text('assessment'),
    plan: text('plan'),
    additional_notes: text('additional_notes'),
    // Nullable with `set null` for the same reason as audit_log.actor_user_id:
    // deleting a staff account must not delete the clinical record they wrote.
    author_user_id: text('author_user_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    // Snapshot at write time, so the note stays attributable after a rename,
    // suspension or deletion. Same rationale as audit_log.actor_name.
    author_name: text('author_name'),
    // Snapshot: the author's role may change later, and "who was this as?"
    // matters clinically (a nursing note reads differently from a doctor's).
    author_role: text('author_role').notNull(),
    // Optimistic lock AND revision counter: the revision created on each edit is
    // numbered with the value this column held before the edit.
    version: integer('version').default(1).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    patientIdx: index('clinical_notes_patient_idx').on(
      table.patient_id,
      table.created_at,
    ),
    encounterIdx: index('clinical_notes_encounter_idx').on(
      table.encounter_id,
      table.created_at,
    ),
  }),
);

/**
 * Superseded versions of a clinical note. **Append-only.**
 *
 * Written only by `ClinicalNotesService.update()`, which copies the current head
 * here before overwriting it. This is what lets a note be corrected while
 * preserving what was originally recorded — silently rewriting an authored
 * clinical record is the thing to avoid.
 *
 * No `updated_at`: a revision is never modified after it is written.
 */
export const clinical_note_revisions = pgTable(
  'clinical_note_revisions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    note_id: uuid('note_id')
      .notNull()
      .references(() => clinical_notes.id, { onDelete: 'cascade' }),
    // The head's `version` at the time this revision was created, so revision 1
    // is the original content and revision N is the Nth superseded version.
    revision_number: integer('revision_number').notNull(),
    note_type: text('note_type').notNull(),
    subjective: text('subjective'),
    objective: text('objective'),
    assessment: text('assessment'),
    plan: text('plan'),
    additional_notes: text('additional_notes'),
    edited_by: text('edited_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    edited_by_name: text('edited_by_name'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    noteIdx: index('clinical_note_revisions_note_idx').on(
      table.note_id,
      table.revision_number,
    ),
  }),
);

/**
 * The longitudinal problem list — diagnoses that persist across visits.
 *
 * Deliberately separate from `clinical_notes`: a note records what happened in
 * one visit, whereas a problem is the durable clinical state that outlives any
 * single encounter. `encounter_id` records where it was first raised but is
 * nullable and `set null`, so deleting a visit does not erase the diagnosis.
 *
 * The ICD-10 catalogue is static code (see core/common/clinical/diagnoses.ts),
 * not a table, so `code`/`diagnosis_slug` are plain columns with no FK.
 */
export const patient_problems = pgTable(
  'patient_problems',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    patient_id: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    encounter_id: uuid('encounter_id').references(() => encounters.id, {
      onDelete: 'set null',
    }),
    // Always free text. Prefilled from the catalogue name when one is picked,
    // but editable — the list is a 30-item shortlist, not a complete coding
    // system, so off-list diagnoses must remain recordable.
    description: text('description').notNull(),
    code: text('code'), // ICD-10 code, e.g. 'B54'. Null for off-list entries.
    code_system: text('code_system'), // 'ICD-10' when `code` is set
    // The catalogue slug, kept so a pick is distinguishable from free text that
    // happens to read the same. Also the key a future translation lookup would
    // use, which is why it is stored rather than derived.
    diagnosis_slug: text('diagnosis_slug'),
    status: text('status').default('active').notNull(), // 'active' | 'resolved' | 'inactive'
    onset_date: timestamp('onset_date'),
    resolved_date: timestamp('resolved_date'),
    recorded_by: text('recorded_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    recorded_by_name: text('recorded_by_name'),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    patientIdx: index('patient_problems_patient_idx').on(
      table.patient_id,
      table.status,
    ),
  }),
);
