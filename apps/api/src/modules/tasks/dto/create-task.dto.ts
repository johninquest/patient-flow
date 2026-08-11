import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Encounter the task belongs to',
    example: '0192a3f4-1b2c-7d8e-9f0a-1b2c3d4e5f60',
  })
  @IsUUID()
  encounter_id: string;

  @ApiProperty({ description: 'Task title', example: 'Draw blood' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Task status',
    enum: ['todo', 'in_progress', 'done'],
    default: 'todo',
  })
  @IsOptional()
  @IsEnum(['todo', 'in_progress', 'done'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Task priority',
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: string;

  @ApiPropertyOptional({ description: 'User ID the task is assigned to' })
  @IsOptional()
  @IsString()
  assigned_user_id?: string;

  @ApiPropertyOptional({ description: 'Role the task is assigned to' })
  @IsOptional()
  @IsString()
  assigned_role?: string;

  @ApiPropertyOptional({
    description: 'Whether the task blocks the encounter',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  blocking?: boolean;

  @ApiPropertyOptional({
    description: 'Due date (ISO 8601)',
    example: '2026-08-15T10:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  due_at?: string;
}
