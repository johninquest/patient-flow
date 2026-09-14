import { z } from 'zod';

export const USER_ROLES = [
  'admin',
  'provider',
  'clinical_staff',
  'front_desk',
] as const;

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
