import { IsString, IsOptional, IsUUID, IsObject } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  actor_user_id: string;

  @IsString()
  actor_role: string;

  @IsString()
  action: string;

  @IsString()
  resource_type: string;

  @IsUUID()
  resource_id: string;

  @IsOptional()
  @IsObject()
  diff?: Record<string, any>;

  @IsOptional()
  @IsString()
  ip_address?: string;
}
