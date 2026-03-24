import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { OwnerAnalyticsController } from './owner-analytics.controller';
import { AnalyticsEventService } from './analytics-event.service';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController, OwnerAnalyticsController],
  providers: [AnalyticsEventService, AnalyticsService],
  exports: [AnalyticsEventService, AnalyticsService],
})
export class AnalyticsModule {}

