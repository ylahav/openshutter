import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminOrOwnerGuard } from '../common/guards/admin-or-owner.guard';
import { AnalyticsService } from './analytics.service';

@Controller('owner/analytics')
@UseGuards(AdminOrOwnerGuard)
export class OwnerAnalyticsController {
  private readonly logger = new Logger(OwnerAnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /api/owner/analytics/search-tag-filters
   * Tag-filter usage for searches attributed to this owner (by userId or owner-site scope).
   */
  @Get('search-tag-filters')
  async getSearchTagFilters(
    @Req() req: Request,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
    @Query('period') period?: 'day' | 'week' | 'month',
  ) {
    const user = (req as any).user;
    if (!user || user.role !== 'owner') {
      throw new ForbiddenException('Only gallery owners can view owner analytics');
    }

    try {
      const dateRange = {
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      };
      const limitNum = limit ? parseInt(limit, 10) || 20 : 20;
      const data = await this.analyticsService.getOwnerSearchTagFilterStats(
        user.id,
        dateRange,
        limitNum,
        period || 'day',
      );
      return { data };
    } catch (error) {
      this.logger.error(
        `Owner search-tag-filters analytics: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new InternalServerErrorException('Failed to load owner analytics');
    }
  }
}
