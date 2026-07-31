import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsUUID,
  IsEnum,
} from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['todo', 'in_progress', 'done'])
  status?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: string;

  @IsOptional()
  @IsString()
  assigned_user_id?: string;

  @IsOptional()
  @IsString()
  assigned_role?: string;

  @IsOptional()
  @IsBoolean()
  blocking?: boolean;

  @IsOptional()
  @IsDateString()
  due_at?: string;
}
