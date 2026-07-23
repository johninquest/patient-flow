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
  role: text('role').default('front_desk').notNull(), // 'admin' | 'provider' | 'clinical_staff' | 'front_desk'
  title: text('title'), // Professional designation: Doctor, Nurse, Medical Physicist, etc.
  status: text('status').default('active').notNull(), // 'active' | 'suspended'
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
    transport_logistics: jsonb('transport_logistics'), // { modes: { public, taxi, ambulance }, comments }
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
    actor_user_id: text('actor_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    actor_role: text('actor_role').notNull(),
    action: text('action').notNull(), // e.g., 'patient.created', 'encounter.status_changed'
    resource_type: text('resource_type').notNull(), // e.g., 'patient', 'encounter', 'task'
    resource_id: uuid('resource_id').notNull(),
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
  }),
);
