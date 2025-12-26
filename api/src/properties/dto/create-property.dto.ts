import { IsString, IsInt, IsOptional } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  name: string;

  @IsString()
  city: string;

  @IsString()
  country: string;

  @IsOptional()
  @IsInt()
  construction_year?: number;
}