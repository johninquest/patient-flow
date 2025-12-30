import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';

@Module({
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService], // Export so other modules can use it
})
export class ActivityModule {}