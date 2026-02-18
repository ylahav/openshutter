import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsEventService } from './analytics-event.service';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsEventService, AnalyticsService],
  exports: [AnalyticsEventService, AnalyticsService],
})
export class AnalyticsModule {}

