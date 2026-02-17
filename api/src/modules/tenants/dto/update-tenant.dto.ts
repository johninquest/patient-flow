import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsString()
  @IsOptional()
  preferred_name?: string;

  @IsString()
  @IsOptional()
  id_card_number?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}