import { z } from 'zod';

export const updateUserStatusSchema = z
  .object({
    status: z.enum(['active', 'suspended']).describe('User account status'),
  })
  .strict();

export type UpdateUserStatusDto = z.infer<typeof updateUserStatusSchema>;
