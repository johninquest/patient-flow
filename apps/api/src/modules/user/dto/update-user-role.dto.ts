import { z } from 'zod';
import { ALL_ROLES } from '../../../core/auth/roles.js';

export const updateUserRoleSchema = z
  .object({
    // `ALL_ROLES`, not `USER_ROLES`: an admin must be able to both grant access
    // and revoke it by setting a user back to `pending`.
    role: z
      .enum(ALL_ROLES, {
        error: `role must be one of: ${ALL_ROLES.join(', ')}`,
      })
      .optional()
      .describe('User role'),
    title: z.string().optional().describe('Professional title/designation'),
  })
  .strict();

export type UpdateUserRoleDto = z.infer<typeof updateUserRoleSchema>;
