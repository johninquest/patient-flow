import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuthGuard } from '../../core/auth/guards/auth.guard';
import { CaslGuard } from '../../core/auth/guards/casl.guard';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(AuthGuard, CaslGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('patient/:id')
  @ApiOperation({ summary: 'Get audit logs for a patient' })
  @ApiResponse({ status: 200, description: 'Audit logs for the patient' })
  async getPatientAuditLogs(@Param('id') id: string) {
    return this.auditService.findByResource('patient', id);
  }

  @Get('encounter/:id')
  @ApiOperation({ summary: 'Get audit logs for an encounter' })
  @ApiResponse({ status: 200, description: 'Audit logs for the encounter' })
  async getEncounterAuditLogs(@Param('id') id: string) {
    return this.auditService.findByResource('encounter', id);
  }

  @Get('task/:id')
  @ApiOperation({ summary: 'Get audit logs for a task' })
  @ApiResponse({ status: 200, description: 'Audit logs for the task' })
  async getTaskAuditLogs(@Param('id') id: string) {
    return this.auditService.findByResource('task', id);
  }

  @Get('user/:id')
  @ApiOperation({ summary: 'Get audit logs for a user' })
  @ApiResponse({ status: 200, description: 'Audit logs for the user' })
  async getUserAuditLogs(@Param('id') id: string) {
    return this.auditService.findByActor(id);
  }
}
