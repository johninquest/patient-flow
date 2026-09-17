import type { CreateAuditLogDto } from './dto/create-audit-log.dto.js';

/**
 * Scope resolution for audit entries.
 *
 * `audit_log.resource_type` / `resource_id` record only the entity an action
 * *targeted*. That is enough to answer "what happened to this encounter?", but
 * not "what happened to this patient?" — an encounter created for a patient is
 * stored as `resource_type='encounter'` with no reference back to the patient,
 * so a patient-history query cannot find it.
 *
 * These helpers compute the denormalized `patient_id` / `encounter_id` scope for
 * each event, so one query can return a patient's complete record. They are pure
 * functions with no database access, which keeps them directly unit-testable —
 * the services that call them are awkward to test because they touch `db`.
 */

/** The scope fields every audit entry carries. */
export interface AuditScope {
  resource_type: string;
  resource_id: string;
  patient_id: string | null;
  encounter_id: string | null;
}

/** The minimum shape of a patient needed to scope an event. */
export interface PatientRef {
  id: string;
}

/** The minimum shape of an encounter needed to scope an event. */
export interface EncounterRef {
  id: string;
  patient_id: string;
}

/** The minimum shape of a task needed to scope an event. */
export interface TaskRef {
  id: string;
  encounter_id: string;
}

/**
 * A patient event. `resource_id` and `patient_id` are the same value — the
 * patient is both the target and the subject.
 */
export function patientAuditScope(patient: PatientRef): AuditScope {
  return {
    resource_type: 'patient',
    resource_id: patient.id,
    patient_id: patient.id,
    encounter_id: null,
  };
}

/**
 * An encounter event. Scoped to the encounter's patient as well as the encounter,
 * so it appears on both timelines.
 */
export function encounterAuditScope(encounter: EncounterRef): AuditScope {
  return {
    resource_type: 'encounter',
    resource_id: encounter.id,
    patient_id: encounter.patient_id,
    encounter_id: encounter.id,
  };
}

/**
 * A task event. A task has no direct patient link, so the patient is reached
 * through the encounter. `patientId` is passed explicitly because the task row
 * alone does not carry it.
 *
 * Accepts null: the patient is resolved via a left join, so it is absent if the
 * encounter's patient cannot be read. The event is still recorded — an audit
 * entry with a null scope is far better than a missing one.
 */
export function taskAuditScope(
  task: TaskRef,
  patientId: string | null,
): AuditScope {
  return {
    resource_type: 'task',
    resource_id: task.id,
    patient_id: patientId,
    encounter_id: task.encounter_id,
  };
}

/**
 * A clinical note event. A note carries both links directly, so the patient does
 * not have to be passed in as it does for tasks.
 */
export function clinicalNoteAuditScope(note: {
  id: string;
  patient_id: string;
  encounter_id: string;
}): AuditScope {
  return {
    resource_type: 'clinical_note',
    resource_id: note.id,
    patient_id: note.patient_id,
    encounter_id: note.encounter_id,
  };
}

/**
 * A problem-list event. `encounter_id` is nullable: a problem can be recorded
 * outside a visit, and it is also cleared if the originating encounter is
 * deleted. The patient scope always survives, which is what keeps a diagnosis
 * visible on the patient timeline regardless of what happened to the visit.
 */
export function problemAuditScope(problem: {
  id: string;
  patient_id: string;
  encounter_id: string | null;
}): AuditScope {
  return {
    resource_type: 'problem',
    resource_id: problem.id,
    patient_id: problem.patient_id,
    encounter_id: problem.encounter_id,
  };
}

/**
 * A user event (provisioning, registration, role or status change). Not patient
 * scoped, so both scope columns stay null.
 */
export function userAuditScope(userId: string): AuditScope {
  return {
    resource_type: 'user',
    resource_id: userId,
    patient_id: null,
    encounter_id: null,
  };
}

/** The diff value shape used for snapshots and change diffs. */
export type AuditDiff = Record<string, { from: unknown; to: unknown }>;

/**
 * Snapshot the given fields of an entity as a creation diff.
 *
 * Create events previously recorded no diff at all, so a timeline entry like
 * "Encounter created" expanded to an empty panel. Recording the initial values
 * makes the entry self-describing: it shows what was created, not just that
 * something was.
 *
 * Fields absent from the entity are skipped rather than recorded as null, so a
 * diff only ever contains fields that genuinely had a value.
 */
export function createdSnapshot(
  entity: Record<string, unknown>,
  fields: readonly string[],
): AuditDiff | null {
  const diff: AuditDiff = {};

  for (const field of fields) {
    if (!(field in entity)) continue;
    diff[field] = { from: null, to: entity[field] ?? null };
  }

  return Object.keys(diff).length > 0 ? diff : null;
}

/**
 * Snapshot the given fields of an entity as a deletion diff.
 *
 * The mirror of `createdSnapshot`: records what was removed. Written *before*
 * the row is deleted, since afterwards the values are gone.
 */
export function deletedSnapshot(
  entity: Record<string, unknown>,
  fields: readonly string[],
): AuditDiff | null {
  const diff: AuditDiff = {};

  for (const field of fields) {
    if (!(field in entity)) continue;
    diff[field] = { from: entity[field] ?? null, to: null };
  }

  return Object.keys(diff).length > 0 ? diff : null;
}

/** Scope fields only — the part of an audit entry these helpers own. */
export type AuditScopeFields = Pick<
  CreateAuditLogDto,
  'resource_type' | 'resource_id' | 'patient_id' | 'encounter_id'
>;
