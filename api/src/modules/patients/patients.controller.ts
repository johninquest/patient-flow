import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { AuthGuard } from '../../core/auth/guards/auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../core/auth/decorators/user.decorator';

@ApiTags('Patients')
@Controller('patients')
@UseGuards(AuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('clinical_staff', 'admin')
  @ApiOperation({ summary: 'Create a patient (clinical staff and admin only)' })
  @ApiResponse({ status: 201, description: 'Patient created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — clinical staff or admin role required',
  })
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: any) {
    return this.patientsService.create(dto, user.id, user.role);
  }

  @Get()
  @ApiOperation({ summary: 'List all patients (role-filtered)' })
  @ApiResponse({
    status: 200,
    description: 'List of patients (filtered by caller role)',
  })
  findAll(@CurrentUser() user: any) {
    return this.patientsService.findAll(user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get patient by ID (role-filtered)' })
  @ApiResponse({
    status: 200,
    description: 'Patient details (filtered by caller role)',
  })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.patientsService.findOne(id, user.role);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a patient (section-level write enforcement)',
  })
  @ApiResponse({ status: 200, description: 'Patient updated successfully' })
  @ApiResponse({ status: 403, description: 'Write outside allowed sections' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: any,
  ) {
    return this.patientsService.update(id, dto, user.id, user.role);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a patient (admin only)' })
  @ApiResponse({ status: 200, description: 'Patient deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.patientsService.remove(id, user.id, user.role);
  }
}
