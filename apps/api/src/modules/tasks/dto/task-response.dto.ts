import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaskResponseDto {
  @ApiProperty({
    description: 'Task ID (uuidv7)',
    example: '0192a3f4-1b2c-7d8e-9f0a-1b2c3d4e5f60',
  })
  id: string;

  @ApiProperty({
    description: 'Encounter the task belongs to',
    example: '0192a3f4-1b2c-7d8e-9f0a-1b2c3d4e5f61',
  })
  encounter_id: string;

  @ApiProperty({
    description: 'Patient full name (read-only, resolved via encounter)',
    example: 'Amara Diallo',
  })
  patient_name: string;

  @ApiProperty({ description: 'Task title', example: 'Draw blood' })
  title: string;

  @ApiPropertyOptional({ description: 'Task description' })
  description: string | null;

  @ApiProperty({
    description: 'Task status',
    enum: ['todo', 'in_progress', 'done'],
    example: 'todo',
  })
  status: string;

  @ApiProperty({
    description: 'Task priority',
    enum: ['low', 'medium', 'high'],
    example: 'medium',
  })
  priority: string;

  @ApiPropertyOptional({ description: 'User ID the task is assigned to' })
  assigned_user_id: string | null;

  @ApiPropertyOptional({ description: 'Role the task is assigned to' })
  assigned_role: string | null;

  @ApiProperty({
    description: 'Whether the task blocks the encounter',
    example: false,
  })
  blocking: boolean;

  @ApiPropertyOptional({
    description: 'Due date',
    type: Date,
    example: '2026-08-15T10:00:00.000Z',
  })
  due_at: Date | null;

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
