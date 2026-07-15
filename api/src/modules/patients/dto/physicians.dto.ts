import { IsString, IsOptional } from 'class-validator';

export class PhysiciansDto {
  @IsOptional()
  @IsString()
  attending?: string;

  @IsOptional()
  @IsString()
  correspondent?: string;

  @IsOptional()
  @IsString()
  other?: string;
}
