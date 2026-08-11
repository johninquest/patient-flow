import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: 'Task title', example: 'Draw blood' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Task status',
    enum: ['todo', 'in_progress', 'done'],
  })
  @IsOptional()
  @IsEnum(['todo', 'in_progress', 'done'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Task priority',
    enum: ['low', 'medium', 'high'],
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
