import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EncounterResponseDto {
  @ApiProperty({
    description: 'Encounter ID (uuidv7)',
    example: '0192a3f4-1b2c-7d8e-9f0a-1b2c3d4e5f60',
  })
  id: string;

  @ApiProperty({
    description: 'Patient ID',
    example: '0192a3f4-1b2c-7d8e-9f0a-1b2c3d4e5f61',
  })
  patient_id: string;

  @ApiProperty({
    description: 'Encounter status',
    enum: ['scheduled', 'checked_in', 'in_progress', 'completed', 'cancelled'],
    example: 'scheduled',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Encounter phase',
    enum: [
      'consultation',
      'awaiting_lab',
      'awaiting_results',
      'treatment',
      'discharge',
    ],
  })
  phase: string | null;

  @ApiPropertyOptional({
    description: 'User ID the encounter is assigned to',
  })
  assigned_to: string | null;

  @ApiPropertyOptional({
    description: 'Scheduled time',
    type: Date,
    example: '2026-08-15T10:00:00.000Z',
  })
  scheduled_time: Date | null;

  @ApiPropertyOptional({ description: 'Encounter notes' })
  notes: string | null;

  @ApiProperty({
    description: 'Optimistic lock version',
    example: 0,
  })
  version: number;

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
