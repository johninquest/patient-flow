import { z } from 'zod';
import {
  ISO_COUNTRY_CODES,
  ISO_CURRENCY_CODES,
} from '../../../core/common/iso-codes.js';
import { isoDateString } from '../../../core/common/validation.js';

/**
 * Nested patient section schemas.
 *
 * These are shared between the create and update DTOs and are also referenced
 * by the response DTO for OpenAPI documentation.
 */

export const addressSchema = z
  .object({
    street: z.string().optional().describe('Street address'),
    postal_code: z.string().optional().describe('Postal code'),
    city: z.string().optional().describe('City'),
    country: z
      .enum(ISO_COUNTRY_CODES, {
        error: 'country must be a valid ISO 3166-1 alpha-2 code',
      })
      .optional()
      .describe('ISO 3166-1 alpha-2 country code'),
  })
  .strict();

export const identitySchema = z
  .object({
    document_type: z
      .string()
      .optional()
      .describe(
        'Document type: national_id, passport, or a custom string for other types',
      ),
    document_number: z
      .string()
      .optional()
      .describe(
        'Document identification number (e.g. passport number, national ID number)',
      ),
    country_national: z
      .enum(ISO_COUNTRY_CODES, {
        error: 'country_national must be a valid ISO 3166-1 alpha-2 code',
      })
      .optional()
      .describe('Nationality (ISO 3166-1 alpha-2)'),
    scanned_document: z
      .boolean()
      .optional()
      .describe('Whether a scanned document is on file'),
  })
  .strict();

export const financialsSchema = z
  .object({
    health_insurance: z
      .string()
      .optional()
      .describe('Health insurance provider'),
    reimbursement: z.string().optional().describe('Reimbursement details'),
    currency: z
      .enum(ISO_CURRENCY_CODES, {
        error: 'currency must be a valid ISO 4217 code',
      })
      .optional()
      .describe('Currency (ISO 4217)'),
  })
  .strict();

export const emergencyContactSchema = z
  .object({
    name: z.string().optional().describe('Contact name'),
    relation: z
      .string()
      .optional()
      .describe(
        'Relationship to patient. The client renders a standard list ' +
          '(partner, parent, child, sibling, grandparent, other_relative, ' +
          'friend_neighbour, carer, other) but any string is accepted so ' +
          'records written before the dropdown existed still round-trip.',
      ),
    phone: z.string().optional().describe('Contact phone number'),
    email: z.string().optional().describe('Contact email'),
    comments: z.string().optional().describe('Additional comments'),
  })
  .strict();

export const physiciansSchema = z
  .object({
    attending: z.string().optional().describe('Attending physician'),
    correspondent: z.string().optional().describe('Correspondent physician'),
    other: z.string().optional().describe('Other physicians'),
  })
  .strict();

/**
 * Transport modes a patient may use to reach the clinic.
 *
 * A patient can use more than one (e.g. taxi some days, public transport
 * others), so this is a set rather than a single choice. The values are the
 * persisted slugs — the client renders them as translated checkbox labels.
 */
export const TRANSPORT_MODES = [
  'public_transport',
  'taxi',
  'ambulance',
] as const;

export const transportModesSchema = z
  .array(
    z.enum(TRANSPORT_MODES, {
      error: `each transport mode must be one of: ${TRANSPORT_MODES.join(', ')}`,
    }),
  )
  .max(TRANSPORT_MODES.length, {
    error: 'at most one entry per transport mode is allowed',
  })
  .optional()
  .describe('Transport modes used by the patient (any subset)');

export const transportLogisticsSchema = z
  .object({
    modes: transportModesSchema.describe('Transport modes'),
    comments: z.string().optional().describe('Transport comments'),
  })
  .strict();

export const createPatientSchema = z
  .object({
    first_name: z.string().min(1).describe('Patient first name'),
    last_name: z.string().min(1).describe('Patient last name'),
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

export type CreatePatientDto = z.infer<typeof createPatientSchema>;
export type AddressDto = z.infer<typeof addressSchema>;
export type IdentityDto = z.infer<typeof identitySchema>;
export type FinancialsDto = z.infer<typeof financialsSchema>;
export type EmergencyContactDto = z.infer<typeof emergencyContactSchema>;
export type PhysiciansDto = z.infer<typeof physiciansSchema>;
export type TransportMode = (typeof TRANSPORT_MODES)[number];
export type TransportModesDto = z.infer<typeof transportModesSchema>;
export type TransportLogisticsDto = z.infer<typeof transportLogisticsSchema>;
