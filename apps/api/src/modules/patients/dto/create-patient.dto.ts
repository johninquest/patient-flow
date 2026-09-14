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
    relation: z.string().optional().describe('Relationship to patient'),
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

export const transportModesSchema = z
  .object({
    public_transport: z
      .string()
      .optional()
      .describe('Public transport details'),
    taxi: z.string().optional().describe('Taxi details'),
    ambulance: z.string().optional().describe('Ambulance details'),
  })
  .strict();

export const transportLogisticsSchema = z
  .object({
    modes: transportModesSchema.optional().describe('Transport modes'),
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
export type TransportModesDto = z.infer<typeof transportModesSchema>;
export type TransportLogisticsDto = z.infer<typeof transportLogisticsSchema>;
