import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * A single encounter card on the patient flow board, including aggregate task
 * counts so staff can see at a glance whether an encounter is blocked.
 */
export class FlowEncounterDto {
  @ApiProperty({ description: 'Encounter ID (uuidv7)' })
  id: string;

  @ApiProperty({ description: 'Patient ID' })
  patient_id: string;

  @ApiProperty({
    description: 'Patient full name',
    example: 'Amara Diallo',
  })
  patient_name: string;

  @ApiProperty({
    description: 'Encounter status',
    enum: ['scheduled', 'checked_in', 'in_progress', 'completed'],
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Sub-state within in_progress',
    enum: [
      'consultation',
      'awaiting_lab',
      'awaiting_results',
      'treatment',
      'discharge',
    ],
  })
  phase: string | null;

  @ApiPropertyOptional({ description: 'Assigned user ID' })
  assigned_to: string | null;

  @ApiPropertyOptional({ description: 'Assigned user display name' })
  assigned_to_name: string | null;

  @ApiPropertyOptional({
    description: 'Scheduled time (null for walk-ins)',
    type: Date,
  })
  scheduled_time: Date | null;

  @ApiProperty({ description: 'Last update timestamp', type: Date })
  updated_at: Date;

  @ApiProperty({ description: 'Total tasks on this encounter', example: 3 })
  task_count: number;

  @ApiProperty({ description: 'Tasks marked done', example: 1 })
  task_done_count: number;

  @ApiProperty({
    description: 'Blocking tasks not yet done',
    example: 1,
  })
  task_blocking_open_count: number;
}
