import { z } from 'zod';

/**
 * Note types. A slug, not a free string, so the client can label it and the
 * audit diff stays small.
 */
export const NOTE_TYPES = [
  'consultation',
  'nursing',
  'procedure',
  'other',
] as const;

export type NoteType = (typeof NOTE_TYPES)[number];

/**
 * The SOAP body shared by create and update.
 *
 * Every field is optional: a note can be saved partially and completed later.
 * `.max()` limits exist to bound a single row — clinical notes are paragraphs,
 * not documents, and an unbounded text column is a denial-of-service vector.
 */
const soapFields = {
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
};

export const createClinicalNoteSchema = z
  .object({
    encounter_id: z.uuid().describe('Encounter this note documents'),
    note_type: z
      .enum(NOTE_TYPES)
      .optional()
      .describe('Note type. Defaults to consultation'),
    ...soapFields,
  })
  .strict();

export type CreateClinicalNoteDto = z.infer<typeof createClinicalNoteSchema>;
