import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service.js';
import {
  UpdateUserRoleDto,
  updateUserRoleSchema,
} from './dto/update-user-role.dto.js';
import { CreateUserDto, createUserSchema } from './dto/create-user.dto.js';
import {
  UpdateUserStatusDto,
  updateUserStatusSchema,
} from './dto/update-user-status.dto.js';
import { ProfileResponseDto } from './dto/profile-response.dto.js';
import { AssignableUserDto } from './dto/assignable-user.dto.js';
import { AuthGuard } from '../../core/auth/guards/auth.guard.js';
import { RolesGuard } from '../../core/auth/guards/roles.guard.js';
import { Roles } from '../../core/auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../core/auth/decorators/user.decorator.js';

@ApiTags('Users')
@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new user account (admin only)' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  create(
    @Body({ schema: createUserSchema }) dto: CreateUserDto,
    @CurrentUser() actor: any,
  ) {
    return this.userService.createUser(dto, actor.id, actor.role);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of users',
    type: [ProfileResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  findAll() {
    return this.userService.findAll();
  }

  @Get('assignable')
  @ApiOperation({
    summary: 'List assignable users (all authenticated users)',
    description:
      'Lightweight picker source for "assign to" dropdowns. Unlike GET /users this is not admin-only and returns only non-sensitive identity fields.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active users available for assignment',
    type: [AssignableUserDto],
  })
  findAssignable() {
    return this.userService.findAssignable();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile data',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyProfile(@CurrentUser() currentUser: any) {
    return this.userService.findMe(currentUser.id);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User details',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Update user role or title (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — cannot demote self or last admin',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(
    @Param('id') id: string,
    @Body({ schema: updateUserRoleSchema }) dto: UpdateUserRoleDto,
    @CurrentUser() actor: any,
  ) {
    return this.userService.updateRole(id, dto, actor.id, actor.role);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Update user status (active/suspended) (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — cannot suspend self or last active admin',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateStatus(
    @Param('id') id: string,
    @Body({ schema: updateUserStatusSchema }) dto: UpdateUserStatusDto,
    @CurrentUser() actor: any,
  ) {
    return this.userService.updateStatus(id, dto, actor.id, actor.role);
  }
}
