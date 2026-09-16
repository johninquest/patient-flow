import { z } from 'zod';
import { ASSIGNABLE_ROLES } from '../../../core/auth/roles.js';

/**
 * Role vocabulary for *creating* a staff account.
 *
 * Deliberately excludes `pending`: an admin who clicks "New Staff" intends to
 * provision a working account, so offering "Pending Access" there would just
 * produce a user who cannot sign in to anything. `pending` is reachable only
 * through self-service Google signup, or by an admin revoking access later via
 * `updateUserRoleSchema`.
 */
export const USER_ROLES = ASSIGNABLE_ROLES;

export const createUserSchema = z
  .object({
    name: z.string().min(2).describe('Full name of the user'),
    email: z.email().describe('Email address'),
    password: z
      .string()
      .min(8)
      .describe('Temporary password (min 8 characters)'),
    role: z.enum(USER_ROLES).describe('User role'),
    title: z.string().optional().describe('Professional title/designation'),
  })
  .strict();

export type CreateUserDto = z.infer<typeof createUserSchema>;
