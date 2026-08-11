import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEncounterDto {
  @ApiPropertyOptional({
    description: 'Encounter status',
    enum: ['scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled'],
  })
  @IsOptional()
  @IsString()
  status?: string;

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
