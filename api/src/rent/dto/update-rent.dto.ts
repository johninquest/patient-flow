import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateRentDto {
  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  payment_date?: string;

  @IsString()
  @IsOptional()
  rent_month?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}