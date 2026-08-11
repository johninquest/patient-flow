import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditLogResponseDto {
  @ApiProperty({
    description: 'Audit log ID (uuidv7)',
    example: '0192a3f4-1b2c-7d8e-9f0a-1b2c3d4e5f60',
  })
  id: string;

  @ApiProperty({ description: 'User ID of the actor' })
  actor_user_id: string;

  @ApiProperty({
    description: 'Role of the actor',
    example: 'admin',
  })
  actor_role: string;

  @ApiProperty({
    description: 'Action performed',
    example: 'patient.created',
  })
  action: string;

  @ApiProperty({
    description: 'Resource type affected',
    example: 'patient',
  })
  resource_type: string;

  @ApiProperty({
    description: 'Resource ID affected',
    example: '0192a3f4-1b2c-7d8e-9f0a-1b2c3d4e5f61',
  })
  resource_id: string;

  @ApiPropertyOptional({
    description: 'Change diff (field → { from, to })',
    example: { status: { from: 'scheduled', to: 'checked_in' } },
  })
  diff: Record<string, any> | null;

  @ApiPropertyOptional({ description: 'IP address of the actor' })
  ip_address: string | null;

  @ApiProperty({
    description: 'Creation timestamp',
    type: Date,
    example: '2026-08-11T12:00:00.000Z',
  })
  created_at: Date;
}
