import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({ description: 'User ID (Better Auth text ID)' })
  id: string;

  @ApiPropertyOptional({ description: 'Display name' })
  name: string | null;

  @ApiProperty({ description: 'Email address' })
  email: string;

  @ApiProperty({ description: 'Whether the email has been verified' })
  emailVerified: boolean | null;

  @ApiPropertyOptional({ description: 'Avatar image URL' })
  image: string | null;

  @ApiProperty({ description: 'User role slug' })
  role: string;

  @ApiPropertyOptional({ description: 'Professional title / designation' })
  title: string | null;

  @ApiProperty({ description: 'Account status' })
  status: string;

  @ApiProperty({ description: 'Account creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Last login timestamp (from most recent session)',
  })
  lastLogin: Date | null;
}
