import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  property: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  expense_date: string;

  @IsString()
  @IsOptional()
  vendor?: string;
}