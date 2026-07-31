import { IsString, IsOptional, IsIn } from 'class-validator';

const VALID_ROLES = [
  'admin',
  'provider',
  'clinical_staff',
  'front_desk',
] as const;

export class UpdateUserRoleDto {
  @IsOptional()
  @IsString()
  @IsIn(VALID_ROLES, {
    message: `role must be one of: ${VALID_ROLES.join(', ')}`,
  })
  role?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
