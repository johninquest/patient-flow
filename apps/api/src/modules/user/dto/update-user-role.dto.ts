import { z } from 'zod';
import { USER_ROLES } from './create-user.dto.js';

export const updateUserRoleSchema = z
  .object({
    role: z
      .enum(USER_ROLES, {
        error: `role must be one of: ${USER_ROLES.join(', ')}`,
      })
      .optional()
      .describe('User role'),
    title: z.string().optional().describe('Professional title/designation'),
  })
  .strict();

export type UpdateUserRoleDto = z.infer<typeof updateUserRoleSchema>;
