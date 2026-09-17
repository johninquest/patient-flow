import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProblemsService } from './problems.service.js';
import {
  CreateProblemDto,
  createProblemSchema,
  UpdateProblemDto,
  updateProblemSchema,
  PROBLEM_STATUSES,
} from './dto/problem.dto.js';
import { ProblemResponseDto } from './dto/problem-response.dto.js';
import { AuthGuard } from '../../core/auth/guards/auth.guard.js';
import { CaslGuard } from '../../core/auth/guards/casl.guard.js';
import { RolesGuard } from '../../core/auth/guards/roles.guard.js';
import { Roles } from '../../core/auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../core/auth/decorators/user.decorator.js';
import { Ability } from '../../core/auth/decorators/ability.decorator.js';
import type { AppAbility } from '../../core/auth/ability.js';

/**
 * The patient problem list — diagnoses that persist across visits.
 *
 * Restricted to clinical roles, matching clinical notes: a diagnosis is clinical
 * information with no partially-safe subset for `front_desk`. See the visibility
 * matrix in docs/contracts/schema.md.
 */
@ApiTags('Problems')
@Controller('problems')
@UseGuards(AuthGuard, CaslGuard, RolesGuard)
@Roles('admin', 'provider', 'clinical_staff')
export class ProblemsController {
  constructor(private readonly problemsService: ProblemsService) {}

  @Post()
  @ApiOperation({ summary: 'Record a problem (diagnosis)' })
  @ApiResponse({
    status: 201,
    description: 'Problem recorded successfully',
    type: ProblemResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error, or a code not present in the diagnosis catalogue',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — clinical role required',
  })
  @ApiResponse({ status: 404, description: 'Patient or encounter not found' })
  create(
    @Body({ schema: createProblemSchema }) dto: CreateProblemDto,
    @CurrentUser() user: any,
    @Ability() ability: AppAbility,
  ) {
    return this.problemsService.create(dto, user.id, user.role, ability);
  }

  @Get()
  @ApiOperation({ summary: 'List problems (optionally filtered)' })
  @ApiQuery({
    name: 'patient_id',
    required: false,
    description: 'Filter by patient',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: `Filter by status: ${PROBLEM_STATUSES.join(', ')}`,
  })
  @ApiResponse({
    status: 200,
    description: 'List of problems, active first',
    type: [ProblemResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — clinical role required',
  })
  findAll(
    @Query('patient_id') patientId?: string,
    @Query('status') status?: string,
  ) {
    return this.problemsService.findAll({ patientId, status });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a problem by ID' })
  @ApiResponse({
    status: 200,
    description: 'Problem details',
    type: ProblemResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — clinical role required',
  })
  @ApiResponse({ status: 404, description: 'Problem not found' })
  findOne(@Param('id') id: string) {
    return this.problemsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a problem' })
  @ApiResponse({
    status: 200,
    description: 'Problem updated successfully',
    type: ProblemResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation error, or a code not present in the diagnosis catalogue',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — clinical role required',
  })
  @ApiResponse({ status: 404, description: 'Problem not found' })
  update(
    @Param('id') id: string,
    @Body({ schema: updateProblemSchema }) dto: UpdateProblemDto,
    @CurrentUser() user: any,
    @Ability() ability: AppAbility,
  ) {
    return this.problemsService.update(id, dto, user.id, user.role, ability);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a problem (admin only)' })
  @ApiResponse({ status: 200, description: 'Problem deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'Problem not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Ability() ability: AppAbility,
  ) {
    return this.problemsService.remove(id, user.id, user.role, ability);
  }
}
