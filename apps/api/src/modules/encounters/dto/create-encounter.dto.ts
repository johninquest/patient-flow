import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEncounterDto {
  @ApiProperty({
    description: 'Patient the encounter belongs to',
    example: '0192a3f4-1b2c-7d8e-9f0a-1b2c3d4e5f60',
  })
  @IsUUID()
  patient_id: string;

  @ApiPropertyOptional({
    description: 'User ID the encounter is assigned to',
  })
  @IsOptional()
  @IsString()
  assigned_to?: string;

  @ApiPropertyOptional({
    description: 'Scheduled time (ISO 8601)',
    example: '2026-08-15T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduled_time?: string;

  @ApiPropertyOptional({ description: 'Encounter notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
