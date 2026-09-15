import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Minimal user projection for assignment pickers.
 * Intentionally excludes sensitive fields (email verification state, status,
 * timestamps) that are irrelevant to choosing an assignee.
 */
export class AssignableUserDto {
  @ApiProperty({ description: 'User ID (Better Auth text ID)' })
  id: string;

  @ApiPropertyOptional({
    description: 'Display name',
    example: 'Dr. Awa Ndiaye',
  })
  name: string | null;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({
    description: 'Role slug',
    enum: ['admin', 'provider', 'clinical_staff', 'front_desk'],
  })
  role: string;

  @ApiPropertyOptional({
    description: 'Professional designation',
    example: 'Doctor',
  })
  title: string | null;
}
