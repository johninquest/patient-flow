import { IsString, IsOptional } from 'class-validator';

export class FinancialsDto {
  @IsOptional()
  @IsString()
  health_insurance?: string;

  @IsOptional()
  @IsString()
  reimbursement?: string;
}
