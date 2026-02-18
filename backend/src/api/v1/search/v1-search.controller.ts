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

@Controller('v1/search')
@UseGuards(ApiKeyGuard, ApiScopeGuard)
@UseInterceptors(RateLimitInterceptor)
@ApiScope('search:read', 'read')
export class V1SearchController {
  constructor(
    private readonly searchService: SearchService,
    @InjectModel('User') private userModel: Model<any>,
  ) {}

  private async getAccessContext(req: Request): Promise<AlbumAccessContext | null> {
    const apiKey = (req as any).apiKey;
    if (!apiKey?.userId) {
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
    };
  }

  /**
   * Search (POST method - preferred)
   * POST /api/v1/search
   */
  @Post()
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

    return {
      data: result,
    };
  }

  /**
   * Search (GET method - for backward compatibility)
   * GET /api/v1/search
   */
  @Get()
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

    return {
      data: result,
    };
  }
}
