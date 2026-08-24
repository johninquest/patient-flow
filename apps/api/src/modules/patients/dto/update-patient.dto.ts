import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ISO_COUNTRY_CODES,
  ISO_CURRENCY_CODES,
} from '../../../core/common/iso-codes';

export class AddressDto {
  @ApiPropertyOptional({ description: 'Street address' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  postal_code?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'ISO 3166-1 alpha-2 country code',
    enum: ISO_COUNTRY_CODES,
    example: 'US',
  })
  @IsOptional()
  @IsString()
  @IsIn(ISO_COUNTRY_CODES, {
    message: 'country must be a valid ISO 3166-1 alpha-2 code',
  })
  country?: string;
}

export class IdentityDto {
  @ApiPropertyOptional({
    description: 'Document type: national_id, passport, or a custom string for other types',
    example: 'national_id',
  })
  @IsOptional()
  @IsString()
  document_type?: string;

  @ApiPropertyOptional({
    description: 'Document identification number (e.g. passport number, national ID number)',
    example: 'AB1234567',
  })
  @IsOptional()
  @IsString()
  document_number?: string;

  @ApiPropertyOptional({
    description: 'Nationality (ISO 3166-1 alpha-2)',
    enum: ISO_COUNTRY_CODES,
    example: 'US',
  })
  @IsOptional()
  @IsString()
  @IsIn(ISO_COUNTRY_CODES, {
    message: 'country_national must be a valid ISO 3166-1 alpha-2 code',
  })
  country_national?: string;

  @ApiPropertyOptional({
    description: 'Whether a scanned document is on file',
  })
  @IsOptional()
  @IsBoolean()
  scanned_document?: boolean;
}

export class FinancialsDto {
  @ApiPropertyOptional({ description: 'Health insurance provider' })
  @IsOptional()
  @IsString()
  health_insurance?: string;

  @ApiPropertyOptional({ description: 'Reimbursement details' })
  @IsOptional()
  @IsString()
  reimbursement?: string;

  @ApiPropertyOptional({
    description: 'Currency (ISO 4217)',
    enum: ISO_CURRENCY_CODES,
    example: 'USD',
  })
  @IsOptional()
  @IsString()
  @IsIn(ISO_CURRENCY_CODES, {
    message: 'currency must be a valid ISO 4217 code',
  })
  currency?: string;
}

export class EmergencyContactDto {
  @ApiPropertyOptional({ description: 'Contact name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Relationship to patient' })
  @IsOptional()
  @IsString()
  relation?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Contact email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Additional comments' })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class PhysiciansDto {
  @ApiPropertyOptional({ description: 'Attending physician' })
  @IsOptional()
  @IsString()
  attending?: string;

  @ApiPropertyOptional({ description: 'Correspondent physician' })
  @IsOptional()
  @IsString()
  correspondent?: string;

  @ApiPropertyOptional({ description: 'Other physicians' })
  @IsOptional()
  @IsString()
  other?: string;
}

export class TransportModesDto {
  @ApiPropertyOptional({ description: 'Public transport details' })
  @IsOptional()
  @IsString()
  public_transport?: string;

  @ApiPropertyOptional({ description: 'Taxi details' })
  @IsOptional()
  @IsString()
  taxi?: string;

  @ApiPropertyOptional({ description: 'Ambulance details' })
  @IsOptional()
  @IsString()
  ambulance?: string;
}

export class TransportLogisticsDto {
  @ApiPropertyOptional({
    description: 'Transport modes',
    type: () => TransportModesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TransportModesDto)
  modes?: TransportModesDto;

  @ApiPropertyOptional({ description: 'Transport comments' })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class UpdatePatientDto {
  @ApiPropertyOptional({ description: 'Patient first name', example: 'Jane' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ description: 'Patient last name', example: 'Doe' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({
    description: 'Date of birth (ISO 8601)',
    example: '1990-01-15',
  })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+1-555-0100' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'jane.doe@example.com',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    description: 'Address',
    type: () => AddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({
    description: 'Identity information',
    type: () => IdentityDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => IdentityDto)
  identity?: IdentityDto;

  @ApiPropertyOptional({
    description: 'Financial information',
    type: () => FinancialsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FinancialsDto)
  financials?: FinancialsDto;

  @ApiPropertyOptional({
    description: 'Emergency contact',
    type: () => EmergencyContactDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergency_contact?: EmergencyContactDto;

  @ApiPropertyOptional({ description: 'Medical history notes' })
  @IsOptional()
  @IsString()
  medical_history?: string;

  @ApiPropertyOptional({
    description: 'Medical history date (ISO 8601)',
    example: '2026-01-15',
  })
  @IsOptional()
  @IsDateString()
  medical_history_date?: string;

  @ApiPropertyOptional({
    description: 'Physicians',
    type: () => PhysiciansDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PhysiciansDto)
  physicians?: PhysiciansDto;

  @ApiPropertyOptional({
    description: 'Transport logistics',
    type: () => TransportLogisticsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TransportLogisticsDto)
  transport_logistics?: TransportLogisticsDto;

  @ApiPropertyOptional({ description: 'General notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
