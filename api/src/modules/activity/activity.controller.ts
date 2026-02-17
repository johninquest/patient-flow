import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ActivityService } from './activity.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CurrentUser } from '../auth/decorators/user.decorator';

@Controller('activity')
@UseGuards(AuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('property/:propertyId')
  async getPropertyActivityFeed(
    @Param('propertyId') propertyId: string,
    @Query('user_id') userId?: string,
    @Query('action') action?: string,
    @Query('days') days?: string,
    @CurrentUser() currentUser?: any,
  ) {
    return this.activityService.getPropertyActivityFeed(
      propertyId,
      currentUser.id,
      {
        user_id: userId,
        action,
        days: days ? parseInt(days, 10) : undefined,
      },
    );
  }
}