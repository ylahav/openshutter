import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody, ApiSecurity } from '@nestjs/swagger';
import { Request } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SearchService, SearchFilters } from '../../../search/search.service';
import { SearchBodyDto } from '../../../search/dto/search-body.dto';
import { ApiKeyGuard } from '../../../api-keys/guards/api-key.guard';
import { ApiScopeGuard } from '../../../api-keys/guards/api-scope.guard';
import { ApiScope } from '../../../api-keys/decorators/api-scope.decorator';
import { RateLimitInterceptor } from '../../../api-keys/interceptors/rate-limit.interceptor';
import type { AlbumAccessContext } from '../../../albums/albums.service';
import { StandardSuccessResponse } from '../dto/standard-error.dto';
import { AnalyticsEventService } from '../../../analytics/analytics-event.service';

@ApiTags('search')
@ApiSecurity('apiKey')
@Controller('v1/search')
@UseGuards(ApiKeyGuard, ApiScopeGuard)
@UseInterceptors(RateLimitInterceptor)
@ApiScope('search:read', 'read')
export class V1SearchController {
  constructor(
    private readonly searchService: SearchService,
    @InjectModel('User') private userModel: Model<any>,
    private readonly analyticsEventService: AnalyticsEventService,
  ) {}

  private async getAccessContext(req: Request): Promise<AlbumAccessContext | null> {
    const apiKey = (req as any).apiKey;
    const siteContext = (req as any).siteContext;

    if (!apiKey?.userId) {
      if (siteContext?.type === 'owner-site') {
        return {
          userId: '',
          groupAliases: [],
          ownerSiteId: siteContext.ownerId as string,
        } as any;
      }
      return null;
    }

    const doc = await this.userModel
      .findById(apiKey.userId)
      .select('groupAliases')
      .lean()
      .exec();

    if (!doc) {
      return null;
    }

    return {
      userId: apiKey.userId.toString(),
      groupAliases: Array.isArray(doc.groupAliases) ? doc.groupAliases : [],
      ownerSiteId: siteContext?.type === 'owner-site' ? (siteContext.ownerId as string) : undefined,
    } as any;
  }

  /**
   * Search (POST method - preferred)
   * POST /api/v1/search
   */
  @Post()
  @ApiOperation({ summary: 'Search (POST)', description: 'Advanced search with filters. Preferred method for complex queries.' })
  @ApiBody({ type: SearchBodyDto })
  @ApiResponse({ status: 200, description: 'Search completed successfully' })
  async searchPost(
    @Req() req: Request,
    @Body() body: SearchBodyDto,
  ): Promise<StandardSuccessResponse> {
    const accessContext = await this.getAccessContext(req);
    const filters: SearchFilters = {
      q: body.q?.trim() || undefined,
      type: body.type || 'photos',
      page: body.page ?? 1,
      limit: body.limit ?? 20,
      albumId: body.albumId?.trim() || undefined,
      tags: body.tags?.length ? body.tags.map((s) => s.trim()).filter(Boolean) : undefined,
      people: body.people?.length ? body.people.map((s) => s.trim()).filter(Boolean) : undefined,
      locationIds: body.locationIds?.length
        ? body.locationIds.map((s) => s.trim()).filter(Boolean)
        : undefined,
      dateFrom: body.dateFrom?.trim() || undefined,
      dateTo: body.dateTo?.trim() || undefined,
      sortBy: body.sortBy || 'date',
      sortOrder: body.sortOrder || 'desc',
    };

    const result = await this.searchService.search(filters, accessContext);

    const apiKey = (req as any).apiKey;
    const siteContext = (req as any).siteContext;
    const ownerScopeId =
      siteContext?.type === 'owner-site' && siteContext.ownerId
        ? String(siteContext.ownerId)
        : undefined;
    const resultCount =
      filters.type === 'photos'
        ? result.totalPhotos
        : filters.type === 'albums'
          ? result.totalAlbums
          : filters.type === 'people'
            ? result.totalPeople
            : filters.type === 'locations'
              ? result.totalLocations
              : (result.totalPhotos || 0) +
                  (result.totalAlbums || 0) +
                  (result.totalPeople || 0) +
                  (result.totalLocations || 0);
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    this.analyticsEventService
      .logSearch(
        {
          query: filters.q,
          searchType: filters.type || 'photos',
          resultCount,
          ownerScopeId,
          filters: {
            tags: filters.tags,
            people: filters.people,
            locationIds: filters.locationIds,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
          },
        },
        {
          userId: apiKey?.userId?.toString?.(),
          ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
          userAgent: typeof userAgent === 'string' ? userAgent : undefined,
        },
      )
      .catch(() => {});

    return {
      data: result,
    };
  }

  /**
   * Search (GET method - for backward compatibility)
   * GET /api/v1/search
   */
  @Get()
  @ApiOperation({ summary: 'Search (GET)', description: 'Simple search via query parameters. Use POST method for advanced filters.' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'type', required: false, description: 'Search type: photos, albums, people, locations, or all' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Search completed successfully' })
  async search(
    @Req() req: Request,
    @Query('q') q?: string,
    @Query('type') type?: 'photos' | 'albums' | 'people' | 'locations' | 'all',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('albumId') albumId?: string,
    @Query('tags') tags?: string,
    @Query('people') people?: string,
    @Query('locationIds') locationIds?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<StandardSuccessResponse> {
    const accessContext = await this.getAccessContext(req);
    const filters: SearchFilters = {
      q: q?.trim() || undefined,
      type: type || 'photos',
      page: page ? parseInt(page, 10) || 1 : 1,
      limit: limit ? parseInt(limit, 10) || 20 : 20,
      albumId: albumId?.trim() || undefined,
      tags: tags ? tags.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      people: people ? people.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      locationIds: locationIds
        ? locationIds.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
      dateFrom: dateFrom?.trim() || undefined,
      dateTo: dateTo?.trim() || undefined,
      sortBy: sortBy || 'date',
      sortOrder: sortOrder || 'desc',
    };

    const result = await this.searchService.search(filters, accessContext);

    const apiKey = (req as any).apiKey;
    const siteContext = (req as any).siteContext;
    const ownerScopeId =
      siteContext?.type === 'owner-site' && siteContext.ownerId
        ? String(siteContext.ownerId)
        : undefined;
    const resultCount =
      filters.type === 'photos'
        ? result.totalPhotos
        : filters.type === 'albums'
          ? result.totalAlbums
          : filters.type === 'people'
            ? result.totalPeople
            : filters.type === 'locations'
              ? result.totalLocations
              : (result.totalPhotos || 0) +
                  (result.totalAlbums || 0) +
                  (result.totalPeople || 0) +
                  (result.totalLocations || 0);
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    this.analyticsEventService
      .logSearch(
        {
          query: filters.q,
          searchType: filters.type || 'photos',
          resultCount,
          ownerScopeId,
          filters: {
            tags: filters.tags,
            people: filters.people,
            locationIds: filters.locationIds,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
          },
        },
        {
          userId: apiKey?.userId?.toString?.(),
          ipAddress: typeof ipAddress === 'string' ? ipAddress : undefined,
          userAgent: typeof userAgent === 'string' ? userAgent : undefined,
        },
      )
      .catch(() => {});

    return {
      data: result,
    };
  }
}
