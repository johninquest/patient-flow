import { Module } from '@nestjs/common';
import { UserAccessController } from './user-access.controller';
import { UserAccessService } from './user-access.service';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [UserAccessController],
  providers: [UserAccessService],
  exports: [UserAccessService],
})
export class UserAccessModule {}

