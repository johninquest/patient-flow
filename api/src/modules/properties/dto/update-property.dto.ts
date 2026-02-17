import { IsString, IsInt, IsOptional, Length, Matches } from 'class-validator';

export class UpdatePropertyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, { message: 'country must be a valid ISO 3166-1 alpha-3 code' })
  @IsOptional()
  country?: string;

  @IsString() 
  @IsOptional()
  address?: string;

  @IsInt()
  @IsOptional()
  construction_year?: number;
}