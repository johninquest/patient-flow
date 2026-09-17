import { z } from 'zod';
import { isoDateString } from '../../../core/common/validation.js';
import { validateDiagnosisCode } from '../../../core/common/clinical/diagnoses.js';

/** Problem lifecycle states. `inactive` is for a diagnosis no longer relevant. */
export const PROBLEM_STATUSES = ['active', 'resolved', 'inactive'] as const;

export type ProblemStatus = (typeof PROBLEM_STATUSES)[number];

/**
 * The diagnosis coding triple, validated against the catalogue.
 *
 * `description` is **never** constrained — the catalogue is a 30-item shortlist,
 * not a coding system, so an off-list diagnosis must remain recordable. The rule
 * is: if a `code` is supplied, it must be a real catalogue entry, and
 * `code_system` / `diagnosis_slug` must agree with it.
 *
 * `superRefine` is used rather than a plain refinement so the error message can
 * name the offending value, which is what makes a rejected pick diagnosable.
 */
const diagnosisFields = {
  code: z
    .string()
    .max(16)
    .optional()
    .describe('ICD-10 code from the diagnosis catalogue (optional)'),
  code_system: z
    .string()
    .max(32)
    .optional()
    .describe('Coding system. Must be "ICD-10" when code is set'),
  diagnosis_slug: z
    .string()
    .max(64)
    .optional()
    .describe('Catalogue slug for the picked diagnosis'),
};

/** Applies the catalogue check to a partial diagnosis triple. */
function refineDiagnosisCode(
  value: {
    code?: string;
    code_system?: string;
    diagnosis_slug?: string;
  },
  ctx: z.RefinementCtx,
) {
  const error = validateDiagnosisCode({
    code: value.code,
    code_system: value.code_system,
    diagnosis_slug: value.diagnosis_slug,
  });

  if (error) {
    ctx.addIssue({ code: 'custom', message: error, path: ['code'] });
  }
}

export const createProblemSchema = z
  .object({
    patient_id: z.uuid().describe('Patient this problem belongs to'),
    encounter_id: z
      .uuid()
      .optional()
      .describe('Encounter where the diagnosis was recorded (optional)'),
    description: z
      .string()
      .min(1)
      .max(500)
      .describe(
        'Diagnosis description. Free text; prefilled from the catalogue',
      ),
    ...diagnosisFields,
    status: z
      .enum(PROBLEM_STATUSES)
      .optional()
      .describe('Problem status. Defaults to active'),
    onset_date: isoDateString
      .optional()
      .describe('When the problem began (ISO 8601)'),
    resolved_date: isoDateString
      .optional()
      .describe('When the problem resolved (ISO 8601)'),
    notes: z.string().max(5_000).optional().describe('Additional context'),
  })
  .strict()
  .superRefine(refineDiagnosisCode);

export type CreateProblemDto = z.infer<typeof createProblemSchema>;

/**
 * Update schema. `patient_id` and `encounter_id` are absent rather than
 * optional: a problem belongs to the patient it was recorded for, and re-pointing
 * it at another patient or visit would rewrite clinical history.
 */
export const updateProblemSchema = z
  .object({
    description: z
      .string()
      .min(1)
      .max(500)
      .optional()
      .describe('Diagnosis description'),
    ...diagnosisFields,
    status: z.enum(PROBLEM_STATUSES).optional().describe('Problem status'),
    onset_date: isoDateString.optional().describe('Onset date (ISO 8601)'),
    resolved_date: isoDateString
      .optional()
      .describe('Resolution date (ISO 8601)'),
    notes: z.string().max(5_000).optional().describe('Additional context'),
  })
  .strict()
  .superRefine(refineDiagnosisCode);

export type UpdateProblemDto = z.infer<typeof updateProblemSchema>;
