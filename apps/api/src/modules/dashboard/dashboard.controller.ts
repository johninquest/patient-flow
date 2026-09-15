import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { DashboardStatsDto } from './dto/dashboard-stats.dto.js';
import { FlowEncounterDto } from './dto/flow-encounter.dto.js';
import { AuthGuard } from '../../core/auth/guards/auth.guard.js';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics',
    type: DashboardStatsDto,
  })
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get('flow')
  @ApiOperation({
    summary: 'Get patient flow board data',
    description:
      'Active encounters plus those completed today, with aggregate task counts and assignee names.',
  })
  @ApiResponse({
    status: 200,
    description: 'Encounters currently in the flow board',
    type: [FlowEncounterDto],
  })
  async getFlow() {
    return this.dashboardService.getFlow();
  }
}
