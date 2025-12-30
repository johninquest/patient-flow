import { IsString, IsNumber, IsOptional, IsNotEmpty, IsIn } from 'class-validator';

export class CreateRentDto {
  @IsString()
  @IsNotEmpty()
  tenant: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  payment_date: string;

  @IsString()
  @IsNotEmpty()
  rent_month: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['cash', 'bank_transfer', 'mobile_money'])
  payment_method: string;

  @IsString()
  @IsOptional()
  notes?: string;
}