import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @IsOptional()
  unit_name?: string;

  @IsString()
  @IsNotEmpty()
  unit_number: string;

  @IsString()
  @IsNotEmpty()
  property: string;
}