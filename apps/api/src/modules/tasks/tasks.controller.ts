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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuthGuard } from '../../core/auth/guards/auth.guard';
import { CaslGuard } from '../../core/auth/guards/casl.guard';
import { CurrentUser } from '../../core/auth/decorators/user.decorator';
import { Ability } from '../../core/auth/decorators/ability.decorator';
import { AppAbility } from '../../core/auth/ability';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(AuthGuard, CaslGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() user: any,
    @Ability() ability: AppAbility,
  ) {
    return this.tasksService.create(dto, user.id, user.role, ability);
  }

  @Get()
  @ApiOperation({ summary: 'List all tasks or filter by encounter' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  findAll(@Query('encounter_id') encounterId?: string) {
    if (encounterId) {
      return this.tasksService.findByEncounter(encounterId);
    }
    return this.tasksService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() user: any,
    @Ability() ability: AppAbility,
  ) {
    return this.tasksService.update(id, dto, user.id, user.role, ability);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a task' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Ability() ability: AppAbility,
  ) {
    return this.tasksService.remove(id, user.id, user.role, ability);
  }
}
