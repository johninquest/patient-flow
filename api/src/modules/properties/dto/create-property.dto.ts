import { IsString, IsInt, IsOptional, Length, Matches } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  name: string;

  @IsString()
  city: string;

  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, { message: 'country must be a valid ISO 3166-1 alpha-3 code' })
  country: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsOptional()
  @IsInt()
  construction_year?: number;
}