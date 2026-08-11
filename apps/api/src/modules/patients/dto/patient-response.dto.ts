import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AddressDto,
  IdentityDto,
  FinancialsDto,
  EmergencyContactDto,
  PhysiciansDto,
  TransportLogisticsDto,
} from './create-patient.dto';

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
