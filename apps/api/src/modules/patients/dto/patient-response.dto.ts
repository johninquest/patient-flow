import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TRANSPORT_MODES } from './create-patient.dto.js';

/**
 * Response-side classes for nested patient sections.
 *
 * These exist purely to drive OpenAPI documentation for nested response
 * objects — `@ApiProperty({ type: () => X })` needs a class reference.
 * Validation for these sections is defined by the Zod schemas in
 * `create-patient.dto.ts`, which are the single source of truth for input.
 */
class AddressDto {
  @ApiPropertyOptional({ description: 'Street address' })
  street?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  postal_code?: string;

  @ApiPropertyOptional({ description: 'City' })
  city?: string;

  @ApiPropertyOptional({ description: 'ISO 3166-1 alpha-2 country code' })
  country?: string;
}

class IdentityDto {
  @ApiPropertyOptional({ description: 'Document type' })
  document_type?: string;

  @ApiPropertyOptional({ description: 'Document identification number' })
  document_number?: string;

  @ApiPropertyOptional({ description: 'Nationality (ISO 3166-1 alpha-2)' })
  country_national?: string;

  @ApiPropertyOptional({ description: 'Whether a scanned document is on file' })
  scanned_document?: boolean;
}

class FinancialsDto {
  @ApiPropertyOptional({ description: 'Health insurance provider' })
  health_insurance?: string;

  @ApiPropertyOptional({ description: 'Reimbursement details' })
  reimbursement?: string;

  @ApiPropertyOptional({ description: 'Currency (ISO 4217)' })
  currency?: string;
}

class EmergencyContactDto {
  @ApiPropertyOptional({ description: 'Contact name' })
  name?: string;

  @ApiPropertyOptional({
    description:
      'Relationship to patient (standard-list slug, e.g. partner, parent, carer)',
    example: 'partner',
  })
  relation?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  email?: string;

  @ApiPropertyOptional({ description: 'Additional comments' })
  comments?: string;
}

class PhysiciansDto {
  @ApiPropertyOptional({ description: 'Attending physician' })
  attending?: string;

  @ApiPropertyOptional({ description: 'Correspondent physician' })
  correspondent?: string;

  @ApiPropertyOptional({ description: 'Other physicians' })
  other?: string;
}

class TransportLogisticsDto {
  @ApiPropertyOptional({
    description: 'Transport modes used by the patient (any subset)',
    enum: TRANSPORT_MODES,
    isArray: true,
    example: ['public_transport', 'taxi'],
  })
  modes?: string[];

  @ApiPropertyOptional({ description: 'Transport comments' })
  comments?: string;
}

export class PatientResponseDto {
  @ApiProperty({
    description: 'Patient ID (uuidv7)',
    example: '0192a3f4-1b2c-7d8e-9f0a-1b2c3d4e5f60',
  })
  id: string;

  @ApiProperty({ description: 'First name', example: 'Jane' })
  first_name: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  last_name: string;

  @ApiPropertyOptional({
    description: 'Date of birth',
    type: Date,
    example: '1990-01-15T00:00:00.000Z',
  })
  date_of_birth: Date | null;

  @ApiPropertyOptional({ description: 'Phone number', example: '+1-555-0100' })
  phone: string | null;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'jane.doe@example.com',
  })
  email: string | null;

  @ApiPropertyOptional({
    description: 'Address',
    type: () => AddressDto,
  })
  address: Record<string, any> | null;

  @ApiPropertyOptional({
    description: 'Identity information',
    type: () => IdentityDto,
  })
  identity: Record<string, any> | null;

  @ApiPropertyOptional({
    description: 'Financial information',
    type: () => FinancialsDto,
  })
  financials: Record<string, any> | null;

  @ApiPropertyOptional({
    description: 'Emergency contact',
    type: () => EmergencyContactDto,
  })
  emergency_contact: Record<string, any> | null;

  @ApiPropertyOptional({ description: 'Medical history notes' })
  medical_history: string | null;

  @ApiPropertyOptional({
    description: 'Medical history date',
    type: Date,
    example: '2026-01-15T00:00:00.000Z',
  })
  medical_history_date: Date | null;

  @ApiPropertyOptional({
    description: 'Physicians',
    type: () => PhysiciansDto,
  })
  physicians: Record<string, any> | null;

  @ApiPropertyOptional({
    description: 'Transport logistics',
    type: () => TransportLogisticsDto,
  })
  transport_logistics: Record<string, any> | null;

  @ApiPropertyOptional({ description: 'General notes' })
  notes: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    type: Date,
    example: '2026-08-11T12:00:00.000Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    type: Date,
    example: '2026-08-11T12:00:00.000Z',
  })
  updated_at: Date;
}
