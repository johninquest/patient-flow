import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { AuthGuard } from './core/auth/guards/auth.guard.js';
import {
  DIAGNOSES,
  DIAGNOSIS_GROUPS,
} from './core/common/clinical/diagnoses.js';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('status')
  getStatus() {
    return this.appService.getStatus();
  }

  /**
   * The ICD-10 diagnosis shortlist used to populate the problem-list picker.
   *
   * Auth-only, with no `CaslGuard` and no `@Roles()`: this is a static clinical
   * reference list containing no patient data, and it is a picker source that
   * every role needs to render a form — including `front_desk`, who cannot read
   * the problems themselves. `CaslGuard` is deliberately omitted because it
   * resolves abilities against the `Subjects` union, and this is not an entity
   * that abilities are defined for.
   *
   * Served from the API rather than duplicated in the client so there is one
   * source of truth for the codes.
   */
  @Get('diagnoses')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'List the ICD-10 diagnosis shortlist (picker source)',
  })
  @ApiResponse({
    status: 200,
    description: 'Diagnosis groups and catalogue entries',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authenticated or pending access',
  })
  getDiagnoses() {
    return {
      groups: DIAGNOSIS_GROUPS,
      items: DIAGNOSES,
    };
  }
}
