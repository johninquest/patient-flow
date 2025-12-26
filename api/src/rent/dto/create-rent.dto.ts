import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

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
  @IsOptional()
  notes?: string;
}