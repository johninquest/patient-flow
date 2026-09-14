import { z } from 'zod';
import { isoDateString } from '../../../core/common/validation.js';

export const createEncounterSchema = z
  .object({
    patient_id: z.uuid().describe('Patient the encounter belongs to'),
    assigned_to: z
      .string()
      .optional()
      .describe('User ID the encounter is assigned to'),
    scheduled_time: isoDateString
      .optional()
      .describe('Scheduled time (ISO 8601)'),
    notes: z.string().optional().describe('Encounter notes'),
  })
  .strict();

export type CreateEncounterDto = z.infer<typeof createEncounterSchema>;
