import { z } from 'zod';
import { isoDateString } from '../../../core/common/validation.js';

export const updateEncounterSchema = z
  .object({
    status: z
      .string()
      .optional()
      .describe(
        'Encounter status (validated against the workflow FSM in the service)',
      ),
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

export type UpdateEncounterDto = z.infer<typeof updateEncounterSchema>;
