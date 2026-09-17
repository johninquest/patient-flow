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
  @UseGuards(RolesGuard)
  @Roles('admin', 'provider', 'clinical_staff')
  @ApiOperation({
    summary: 'Get audit logs concerning a patient (clinical roles only)',
  })
  @ApiResponse({
    status: 200,
    description:
      "The patient's own events, plus every encounter and task event concerning them",
    type: [AuditLogResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Forbidden — clinical role required' })
  async getPatientAuditLogs(@Param('id') id: string) {
    // Scoped by the denormalized `patient_id` column, not by `resource_type`:
    // an encounter or task event names itself as the target and carries no
    // reference to the patient, so a type match can never return it.
    //
    // Restricted to clinical roles because the diffs can include fields from the
    // patient `medical` section, which `front_desk` cannot read on the patient
    // record itself.
    return this.auditService.findByPatient(id);
  }

  @Get('encounter/:id')
  @ApiOperation({ summary: 'Get audit logs concerning an encounter' })
  @ApiResponse({
    status: 200,
    description: "The encounter's own events, plus every task event on it",
    type: [AuditLogResponseDto],
  })
  async getEncounterAuditLogs(@Param('id') id: string) {
    // Scoped by `encounter_id` so task events on this encounter are included.
    return this.auditService.findByEncounter(id);
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
