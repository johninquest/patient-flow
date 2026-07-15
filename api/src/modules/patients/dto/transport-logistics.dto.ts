import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TransportModesDto {
  @IsOptional()
  @IsString()
  public?: string;

  @IsOptional()
  @IsString()
  taxi?: string;

  @IsOptional()
  @IsString()
  ambulance?: string;
}

export class TransportLogisticsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => TransportModesDto)
  modes?: TransportModesDto;

  @IsOptional()
  @IsString()
  comments?: string;
}
