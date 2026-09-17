import { z } from 'zod';

/**
 * Internal shape for audit log records.
 *
 * This is not an HTTP boundary: `AuditService.record()` builds these objects
 * itself from authenticated request context. The schema exists for consistency
 * with the other DTOs and gives us a validation entry point should this ever
 * be exposed.
 */
export const createAuditLogSchema = z
  .object({
    actor_user_id: z.string().describe('User ID of the actor'),
    actor_role: z.string().describe('Role of the actor'),
    action: z.string().describe('Action performed'),
    resource_type: z.string().describe('Resource type affected'),
    // Not `z.uuid()`: this is polymorphic. Business entities use uuidv7, but
    // Better Auth user ids are nanoid text (see ADR 0001).
    resource_id: z.string().describe('Resource ID affected'),
    // Denormalized scope — see audit-scope.ts for why these exist.
    patient_id: z
      .string()
      .nullable()
      .optional()
      .describe('Patient this event concerns'),
    encounter_id: z
      .string()
      .nullable()
      .optional()
      .describe('Encounter this event concerns'),
    diff: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Change diff (field → { from, to })'),
    ip_address: z.string().optional().describe('IP address of the actor'),
  })
  .strict();

export type CreateAuditLogDto = z.infer<typeof createAuditLogSchema>;
