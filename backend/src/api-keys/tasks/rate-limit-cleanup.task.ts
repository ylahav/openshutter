import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RateLimitService } from '../rate-limit.service';

@Injectable()
export class RateLimitCleanupTask {
  private readonly logger = new Logger(RateLimitCleanupTask.name);

  constructor(private rateLimitService: RateLimitService) {}

  /**
   * Clean up expired rate limit entries every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  handleCleanup() {
    this.logger.debug('Running rate limit cleanup task');
    this.rateLimitService.cleanupExpiredEntries();
  }
}
