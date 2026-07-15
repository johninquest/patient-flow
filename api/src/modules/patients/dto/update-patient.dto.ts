import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddressDto {
  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  postal_code?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

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

export class FinancialsDto {
  @IsOptional()
  @IsString()
  health_insurance?: string;

  @IsOptional()
  @IsString()
  reimbursement?: string;
}

export class EmergencyContactDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  relation?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  comments?: string;
}

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

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => IdentityDto)
  identity?: IdentityDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => FinancialsDto)
  financials?: FinancialsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergency_contact?: EmergencyContactDto;

  @IsOptional()
  @IsString()
  medical_history?: string;

  @IsOptional()
  @IsDateString()
  medical_history_date?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PhysiciansDto)
  physicians?: PhysiciansDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TransportLogisticsDto)
  transport_logistics?: TransportLogisticsDto;

  @IsOptional()
  @IsString()
  notes?: string;
}
