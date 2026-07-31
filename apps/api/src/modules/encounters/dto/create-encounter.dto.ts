import { IsString, IsOptional, IsDateString, IsUUID } from 'class-validator';

export class CreateEncounterDto {
  @IsUUID()
  patient_id: string;

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
