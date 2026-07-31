import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({
    description: 'User account status',
    enum: ['active', 'suspended'],
    example: 'suspended',
  })
  @IsString()
  @IsIn(['active', 'suspended'])
  status: string;
}
