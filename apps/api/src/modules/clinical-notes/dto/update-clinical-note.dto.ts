import { z } from 'zod';
import { NOTE_TYPES } from './create-clinical-note.dto.js';

/**
 * Update schema — all SOAP fields optional.
 *
 * `encounter_id` is deliberately absent rather than optional: a note documents
 * the visit it was written in, and re-pointing it at another encounter would
 * silently rewrite clinical history. `.strict()` makes the omission enforceable.
 */
export const updateClinicalNoteSchema = z
  .object({
    note_type: z.enum(NOTE_TYPES).optional().describe('Note type'),
    // `version` is the optimistic lock. Required so a stale client cannot
    // silently overwrite an edit made in another session — this is a clinical
    // record, so last-write-wins is not acceptable.
    version: z
      .number()
      .int()
      .describe('Current version of the note being edited (optimistic lock)'),
    subjective: z
      .string()
      .max(10_000)
      .optional()
      .describe('SOAP: patient-reported history and symptoms'),
    objective: z
      .string()
      .max(10_000)
      .optional()
      .describe('SOAP: examination findings, vitals, observations'),
    assessment: z
      .string()
      .max(10_000)
      .optional()
      .describe('SOAP: clinical impression — the diagnosis narrative'),
    plan: z
      .string()
      .max(10_000)
      .optional()
      .describe('SOAP: treatment plan and follow-up'),
    additional_notes: z
      .string()
      .max(10_000)
      .optional()
      .describe('Anything outside the SOAP structure'),
  })
  .strict();

export type UpdateClinicalNoteDto = z.infer<typeof updateClinicalNoteSchema>;
