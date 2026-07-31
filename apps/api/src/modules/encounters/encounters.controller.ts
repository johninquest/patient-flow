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
import { EncountersService } from './encounters.service';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { UpdateEncounterDto } from './dto/update-encounter.dto';
import { AuthGuard } from '../../core/auth/guards/auth.guard';
import { CaslGuard } from '../../core/auth/guards/casl.guard';
import { CurrentUser } from '../../core/auth/decorators/user.decorator';
import { Ability } from '../../core/auth/decorators/ability.decorator';
import { AppAbility } from '../../core/auth/ability';

@ApiTags('Encounters')
@Controller('encounters')
@UseGuards(AuthGuard, CaslGuard)
export class EncountersController {
  constructor(private readonly encountersService: EncountersService) {}

  @Post()
  @ApiOperation({ summary: 'Create an encounter' })
  @ApiResponse({ status: 201, description: 'Encounter created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  create(
    @Body() dto: CreateEncounterDto,
    @CurrentUser() user: any,
    @Ability() ability: AppAbility,
  ) {
    return this.encountersService.create(dto, user.id, user.role, ability);
  }

  @Get()
  @ApiOperation({ summary: 'List all encounters' })
  @ApiResponse({ status: 200, description: 'List of encounters' })
  findAll() {
    return this.encountersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get encounter by ID' })
  @ApiResponse({ status: 200, description: 'Encounter details' })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  findOne(@Param('id') id: string) {
    return this.encountersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an encounter' })
  @ApiResponse({ status: 200, description: 'Encounter updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition or optimistic lock conflict',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to update this encounter',
  })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEncounterDto,
    @CurrentUser() user: any,
    @Ability() ability: AppAbility,
  ) {
    return this.encountersService.update(id, dto, user.id, user.role, ability);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an encounter (admin only)' })
  @ApiResponse({ status: 200, description: 'Encounter deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Ability() ability: AppAbility,
  ) {
    return this.encountersService.remove(id, user.id, user.role, ability);
  }
}
