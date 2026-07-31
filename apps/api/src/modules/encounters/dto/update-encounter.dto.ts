import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class UpdateEncounterDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  assigned_to?: string;

  @IsOptional()
  @IsDateString()
  scheduled_time?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
