import {
  IsString,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto } from './address.dto';
import { IdentityDto } from './identity.dto';
import { FinancialsDto } from './financials.dto';
import { EmergencyContactDto } from './emergency-contact.dto';
import { PhysiciansDto } from './physicians.dto';
import { TransportLogisticsDto } from './transport-logistics.dto';

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
