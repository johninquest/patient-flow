/**
 * Types for clinical documentation — SOAP notes and the patient problem list.
 *
 * These mirror the API contract in `docs/contracts/api_spec.md` exactly; the API
 * uses snake_case field names, so these do too.
 */

export type NoteType = 'consultation' | 'nursing' | 'procedure' | 'other';

export const NOTE_TYPES: NoteType[] = [
  'consultation',
  'nursing',
  'procedure',
  'other',
];

export type ProblemStatus = 'active' | 'resolved' | 'inactive';

export const PROBLEM_STATUSES: ProblemStatus[] = [
  'active',
  'resolved',
  'inactive',
];

/** A SOAP clinical note documenting a visit. */
export interface ClinicalNote {
  id: string;
  patient_id: string;
  encounter_id: string;
  patient_name: string | null;
  note_type: NoteType;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  additional_notes: string | null;
  author_user_id: string | null;
  /** Snapshot of the author's name at write time. */
  author_name: string | null;
  /** The author's role at write time — "who was this as?" is clinically meaningful. */
  author_role: string;
  /** Optimistic lock. Incremented on each edit; also the revision counter. */
  version: number;
  created_at: string;
  updated_at: string;
}

/**
 * A superseded version of a note.
 *
 * Revision 1 is the original content; revision N is the Nth superseded version.
 */
export interface ClinicalNoteRevision {
  id: string;
  note_id: string;
  revision_number: number;
  note_type: NoteType;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  additional_notes: string | null;
  edited_by: string | null;
  edited_by_name: string | null;
  created_at: string;
}

/** A diagnosis on the patient's longitudinal problem list. */
export interface Problem {
  id: string;
  patient_id: string;
  /** Where it was recorded. Null if outside a visit, or if the visit was deleted. */
  encounter_id: string | null;
  patient_name: string | null;
  description: string;
  /** ICD-10 code from the catalogue. Null for off-list entries. */
  code: string | null;
  code_system: string | null;
  /** Catalogue slug, if picked from the list. */
  diagnosis_slug: string | null;
  status: ProblemStatus;
  onset_date: string | null;
  resolved_date: string | null;
  recorded_by: string | null;
  recorded_by_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * An entry in the ICD-10 diagnosis shortlist.
 *
 * `name` is **English-only and rendered as-is** — a deliberate exception to the
 * app's i18n rule (see ADR 0021 and `i18n-review-queue.md`). Only `group` is
 * translated, via `diagnoses.groups.*`.
 */
export interface DiagnosisEntry {
  code: string;
  slug: string;
  name: string;
  group: DiagnosisGroup;
}

export type DiagnosisGroup =
  | 'infectious'
  | 'respiratory'
  | 'cancer'
  | 'chronic'
  | 'other';

export interface DiagnosisCatalogue {
  groups: DiagnosisGroup[];
  items: DiagnosisEntry[];
}

/**
 * Maps a problem status to a design-system status type.
 * `inactive` and `resolved` both map to `ready` — they are visually
 * distinguished by their label, never by colour alone.
 */
export function problemStatusToDesignSystem(
  status: ProblemStatus,
): 'waiting' | 'in_progress' | 'ready' | 'delayed' {
  switch (status) {
    case 'active':
      return 'in_progress';
    case 'resolved':
    case 'inactive':
      return 'ready';
    default:
      return 'waiting';
  }
}
