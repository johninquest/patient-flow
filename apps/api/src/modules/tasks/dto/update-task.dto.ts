import { z } from 'zod';
import { isoDateString } from '../../../core/common/validation.js';

export const updateTaskSchema = z
  .object({
    title: z.string().optional().describe('Task title'),
    description: z.string().optional().describe('Task description'),
    status: z
      .enum(['todo', 'in_progress', 'done'])
      .optional()
      .describe('Task status'),
    priority: z
      .enum(['low', 'medium', 'high'])
      .optional()
      .describe('Task priority'),
    assigned_user_id: z
      .string()
      .optional()
      .describe('User ID the task is assigned to'),
    assigned_role: z
      .string()
      .optional()
      .describe('Role the task is assigned to'),
    blocking: z
      .boolean()
      .optional()
      .describe('Whether the task blocks the encounter'),
    due_at: isoDateString.optional().describe('Due date (ISO 8601)'),
  })
  .strict();

export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
