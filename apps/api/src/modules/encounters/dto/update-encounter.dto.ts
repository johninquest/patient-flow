import { z } from 'zod';
import { isoDateString } from '../../../core/common/validation.js';

export const updateEncounterSchema = z
  .object({
    status: z
      .enum([
        'scheduled',
        'checked_in',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
      ])
      .optional()
      .describe('Encounter status (validated against the workflow FSM)'),
    phase: z
      .enum([
        'consultation',
        'awaiting_lab',
        'awaiting_results',
        'treatment',
        'discharge',
      ])
      .optional()
      .describe(
        'Sub-state within in_progress (requires status to be in_progress)',
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
