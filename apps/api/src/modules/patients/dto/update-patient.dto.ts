import { z } from 'zod';
import { isoDateString } from '../../../core/common/validation.js';
import {
  addressSchema,
  emergencyContactSchema,
  financialsSchema,
  identitySchema,
  physiciansSchema,
  transportLogisticsSchema,
} from './create-patient.dto.js';

/**
 * Update schema — every field is optional.
 *
 * Nested section schemas are reused from the create DTO so the two stay in sync.
 * Each property is declared explicitly rather than via `.partial()` so that
 * `first_name` / `last_name` remain plain optional strings (matching the
 * previous `@IsOptional() @IsString()` behaviour, which did not enforce a
 * minimum length on update).
 */
export const updatePatientSchema = z
  .object({
    first_name: z.string().optional().describe('Patient first name'),
    last_name: z.string().optional().describe('Patient last name'),
    date_of_birth: isoDateString
      .optional()
      .describe('Date of birth (ISO 8601)'),
    phone: z.string().optional().describe('Phone number'),
    email: z.string().optional().describe('Email address'),
    address: addressSchema.optional().describe('Address'),
    identity: identitySchema.optional().describe('Identity information'),
    financials: financialsSchema.optional().describe('Financial information'),
    emergency_contact: emergencyContactSchema
      .optional()
      .describe('Emergency contact'),
    medical_history: z.string().optional().describe('Medical history notes'),
    medical_history_date: isoDateString
      .optional()
      .describe('Medical history date (ISO 8601)'),
    physicians: physiciansSchema.optional().describe('Physicians'),
    transport_logistics: transportLogisticsSchema
      .optional()
      .describe('Transport logistics'),
    notes: z.string().optional().describe('General notes'),
  })
  .strict();

export type UpdatePatientDto = z.infer<typeof updatePatientSchema>;
