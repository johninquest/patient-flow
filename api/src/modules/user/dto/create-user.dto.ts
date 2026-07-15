import {
  IsString,
  IsEmail,
  MinLength,
  IsOptional,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Full name of the user', example: 'John Doe' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ description: 'Email address', example: 'john.doe@clinic.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Temporary password (min 8 characters)',
    example: 'TempPass123!',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'User role',
    enum: ['admin', 'provider', 'clinical_staff', 'front_desk'],
    example: 'provider',
  })
  @IsString()
  @IsIn(['admin', 'provider', 'clinical_staff', 'front_desk'])
  role: string;

  @ApiPropertyOptional({
    description: 'Professional title/designation',
    example: 'Doctor',
  })
  @IsOptional()
  @IsString()
  title?: string;
}
