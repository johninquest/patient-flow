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
import { TasksService } from './tasks.service.js';
import { CreateTaskDto, createTaskSchema } from './dto/create-task.dto.js';
import { UpdateTaskDto, updateTaskSchema } from './dto/update-task.dto.js';
import { TaskResponseDto } from './dto/task-response.dto.js';
import { AuthGuard } from '../../core/auth/guards/auth.guard.js';
import { CaslGuard } from '../../core/auth/guards/casl.guard.js';
import { CurrentUser } from '../../core/auth/decorators/user.decorator.js';
import { Ability } from '../../core/auth/decorators/ability.decorator.js';
import type { AppAbility } from '../../core/auth/ability.js';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(AuthGuard, CaslGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a task' })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  create(
    @Body({ schema: createTaskSchema }) dto: CreateTaskDto,
    @CurrentUser() user: any,
    @Ability() ability: AppAbility,
  ) {
    return this.tasksService.create(dto, user.id, user.role, ability);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks (optionally filtered)' })
  @ApiQuery({
    name: 'encounter_id',
    required: false,
    description: 'Filter by encounter',
  })
  @ApiQuery({
    name: 'assigned_user_id',
    required: false,
    description: 'Filter by assignee',
  })
  @ApiResponse({
    status: 200,
    description: 'List of tasks',
    type: [TaskResponseDto],
  })
  findAll(
    @Query('encounter_id') encounterId?: string,
    @Query('assigned_user_id') assignedUserId?: string,
  ) {
    return this.tasksService.findAll({ encounterId, assignedUserId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({
    status: 200,
    description: 'Task details',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a task' })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  update(
    @Param('id') id: string,
    @Body({ schema: updateTaskSchema }) dto: UpdateTaskDto,
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
