import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuditService } from './audit.service.js';
import { AuditLogResponseDto } from './dto/audit-log-response.dto.js';
import { AuthGuard } from '../../core/auth/guards/auth.guard.js';
import { CaslGuard } from '../../core/auth/guards/casl.guard.js';
import { RolesGuard } from '../../core/auth/guards/roles.guard.js';
import { Roles } from '../../core/auth/decorators/roles.decorator.js';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(AuthGuard, CaslGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('patient/:id')
  @ApiOperation({ summary: 'Get audit logs for a patient' })
  @ApiResponse({
    status: 200,
    description: 'Audit logs for the patient',
    type: [AuditLogResponseDto],
  })
  async getPatientAuditLogs(@Param('id') id: string) {
    return this.auditService.findByResource('patient', id);
  }

  @Get('encounter/:id')
  @ApiOperation({ summary: 'Get audit logs for an encounter' })
  @ApiResponse({
    status: 200,
    description: 'Audit logs for the encounter',
    type: [AuditLogResponseDto],
  })
  async getEncounterAuditLogs(@Param('id') id: string) {
    return this.auditService.findByResource('encounter', id);
  }

  @Get('task/:id')
  @ApiOperation({ summary: 'Get audit logs for a task' })
  @ApiResponse({
    status: 200,
    description: 'Audit logs for the task',
    type: [AuditLogResponseDto],
  })
  async getTaskAuditLogs(@Param('id') id: string) {
    return this.auditService.findByResource('task', id);
  }

  @Get('users')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all user audit logs (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'All user-provisioning and access audit logs',
    type: [AuditLogResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  async getUserAuditLogs() {
    return this.auditService.findByResourceType('user');
  }

  @Get('user/:id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get audit logs for a user (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Audit logs for the user',
    type: [AuditLogResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  async getAuditLogsByActor(@Param('id') id: string) {
    return this.auditService.findByActor(id);
  }
}
