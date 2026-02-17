import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateExpenseDto {
  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  expense_date?: string;

  @IsString()
  @IsOptional()
  vendor?: string;
}