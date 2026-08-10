import {
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  IsBoolean,
  ValidateNested,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ISO_COUNTRY_CODES,
  ISO_CURRENCY_CODES,
} from '../../../core/common/iso-codes';

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
  @IsIn(ISO_COUNTRY_CODES, {
    message: 'country must be a valid ISO 3166-1 alpha-2 code',
  })
  country?: string;
}

export class IdentityDto {
  @IsOptional()
  @IsString()
  document_type?: string;

  @IsOptional()
  @IsString()
  @IsIn(ISO_COUNTRY_CODES, {
    message: 'country_national must be a valid ISO 3166-1 alpha-2 code',
  })
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

  @IsOptional()
  @IsString()
  @IsIn(ISO_CURRENCY_CODES, {
    message: 'currency must be a valid ISO 4217 code',
  })
  currency?: string;
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
  public_transport?: string;

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

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

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
