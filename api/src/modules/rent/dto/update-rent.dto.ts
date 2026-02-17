import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

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
  @IsIn(['cash', 'bank_transfer', 'mobile_money'])
  payment_method?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}