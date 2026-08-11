import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const VALID_ROLES = [
  'admin',
  'provider',
  'clinical_staff',
  'front_desk',
] as const;

export class UpdateUserRoleDto {
  @ApiPropertyOptional({
    description: 'User role',
    enum: VALID_ROLES,
    example: 'provider',
  })
  @IsOptional()
  @IsString()
  @IsIn(VALID_ROLES, {
    message: `role must be one of: ${VALID_ROLES.join(', ')}`,
  })
  role?: string;

  @ApiPropertyOptional({
    description: 'Professional title/designation',
    example: 'Doctor',
  })
  @IsOptional()
  @IsString()
  title?: string;
}
