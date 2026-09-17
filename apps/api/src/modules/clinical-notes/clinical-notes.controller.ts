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
import { ClinicalNotesService } from './clinical-notes.service.js';
import {
  CreateClinicalNoteDto,
  createClinicalNoteSchema,
} from './dto/create-clinical-note.dto.js';
import {
  UpdateClinicalNoteDto,
  updateClinicalNoteSchema,
} from './dto/update-clinical-note.dto.js';
import {
  ClinicalNoteResponseDto,
  ClinicalNoteRevisionResponseDto,
} from './dto/clinical-note-response.dto.js';
import { AuthGuard } from '../../core/auth/guards/auth.guard.js';
import { CaslGuard } from '../../core/auth/guards/casl.guard.js';
import { RolesGuard } from '../../core/auth/guards/roles.guard.js';
import { Roles } from '../../core/auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../core/auth/decorators/user.decorator.js';
import { Ability } from '../../core/auth/decorators/ability.decorator.js';
import type { AppAbility } from '../../core/auth/ability.js';

/**
 * Clinical notes — SOAP documentation of a visit.
 *
 * The whole controller is restricted to clinical roles. Unlike the patient
 * record (where visibility is filtered per section), there is no partially-safe
 * subset of a clinical note, so `front_desk` is refused outright rather than
 * served a redacted view. See the visibility matrix in docs/contracts/schema.md.
 */
@ApiTags('Clinical Notes')
@Controller('clinical-notes')
@UseGuards(AuthGuard, CaslGuard, RolesGuard)
@Roles('admin', 'provider', 'clinical_staff')
export class ClinicalNotesController {
  constructor(private readonly clinicalNotesService: ClinicalNotesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a clinical note' })
  @ApiResponse({
    status: 201,
    description: 'Note created successfully',
    type: ClinicalNoteResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — clinical role required',
  })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  create(
    @Body({ schema: createClinicalNoteSchema }) dto: CreateClinicalNoteDto,
    @CurrentUser() user: any,
    @Ability() ability: AppAbility,
  ) {
    return this.clinicalNotesService.create(dto, user.id, user.role, ability);
  }

  @Get()
  @ApiOperation({ summary: 'List clinical notes (optionally filtered)' })
  @ApiQuery({
    name: 'patient_id',
    required: false,
    description: 'Filter by patient',
  })
  @ApiQuery({
    name: 'encounter_id',
    required: false,
    description: 'Filter by encounter',
  })
  @ApiResponse({
    status: 200,
    description: 'List of clinical notes, newest first',
    type: [ClinicalNoteResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — clinical role required',
  })
  findAll(
    @Query('patient_id') patientId?: string,
    @Query('encounter_id') encounterId?: string,
  ) {
    return this.clinicalNotesService.findAll({ patientId, encounterId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a clinical note by ID' })
  @ApiResponse({
    status: 200,
    description: 'Clinical note details',
    type: ClinicalNoteResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — clinical role required',
  })
  @ApiResponse({ status: 404, description: 'Note not found' })
  findOne(@Param('id') id: string) {
    return this.clinicalNotesService.findOne(id);
  }

  @Get(':id/revisions')
  @ApiOperation({
    summary: "Get a clinical note's revision history (superseded content)",
  })
  @ApiResponse({
    status: 200,
    description:
      'Superseded versions, oldest first. Revision 1 is the original content',
    type: [ClinicalNoteRevisionResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — clinical role required',
  })
  @ApiResponse({ status: 404, description: 'Note not found' })
  findRevisions(@Param('id') id: string) {
    return this.clinicalNotesService.findRevisions(id);
  }

  @Put(':id')
  @ApiOperation({
    summary:
      'Edit a clinical note (author or admin); superseded content is kept',
  })
  @ApiResponse({
    status: 200,
    description: 'Note updated; the previous content is now a revision',
    type: ClinicalNoteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 403,
    description: 'Not the author and not an admin',
  })
  @ApiResponse({ status: 404, description: 'Note not found' })
  @ApiResponse({
    status: 409,
    description: 'Optimistic lock conflict — the note was edited elsewhere',
  })
  update(
    @Param('id') id: string,
    @Body({ schema: updateClinicalNoteSchema }) dto: UpdateClinicalNoteDto,
    @CurrentUser() user: any,
    @Ability() ability: AppAbility,
  ) {
    return this.clinicalNotesService.update(
      id,
      dto,
      user.id,
      user.role,
      ability,
    );
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a clinical note (admin only)' })
  @ApiResponse({ status: 200, description: 'Note deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'Note not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Ability() ability: AppAbility,
  ) {
    return this.clinicalNotesService.remove(id, user.id, user.role, ability);
  }
}
