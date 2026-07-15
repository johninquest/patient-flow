import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class IdentityDto {
  @IsOptional()
  @IsString()
  document_type?: string;

  @IsOptional()
  @IsString()
  country_national?: string;

  @IsOptional()
  @IsBoolean()
  scanned_document?: boolean;
}
