import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiSecurity } from '@nestjs/swagger';
import { connectDB } from '../../../config/db';
import mongoose, { Types } from 'mongoose';
import { ApiKeyGuard } from '../../../api-keys/guards/api-key.guard';
import { ApiScopeGuard } from '../../../api-keys/guards/api-scope.guard';
import { ApiScope } from '../../../api-keys/decorators/api-scope.decorator';
import { RateLimitInterceptor } from '../../../api-keys/interceptors/rate-limit.interceptor';
import { StandardSuccessResponse } from '../dto/standard-error.dto';
import { ownerSiteUserIdFromRequest } from '../../../common/utils/owner-site-from-request.util';

@ApiTags('pages')
@ApiSecurity('apiKey')
@Controller('v1/pages')
@UseGuards(ApiKeyGuard, ApiScopeGuard)
@UseInterceptors(RateLimitInterceptor)
@ApiScope('pages:read', 'read')
export class V1PagesController {
  /**
   * List published pages
   * GET /api/v1/pages
   */
  @Get()
  @ApiOperation({ summary: 'List pages', description: 'Get a paginated list of all published pages' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 50)' })
  @ApiResponse({ status: 200, description: 'Pages retrieved successfully' })
  async findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<StandardSuccessResponse> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('pages');
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '50', 10);
    const skip = (pageNum - 1) * limitNum;

    const ownerUserId = ownerSiteUserIdFromRequest(req);
    const listFilter: Record<string, unknown> = { isPublished: true };
    if (ownerUserId && Types.ObjectId.isValid(ownerUserId)) {
      listFilter.createdBy = new Types.ObjectId(ownerUserId);
    }

    const [pages, total] = await Promise.all([
      collection
        .find(listFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      collection.countDocuments(listFilter),
    ]);

    const serializedPages = pages.map((page) => ({
      ...page,
      _id: page._id.toString(),
      createdBy: page.createdBy?.toString() || page.createdBy,
    }));

    return {
      data: serializedPages,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get page by slug
   * GET /api/v1/pages/:slug
   */
  @Get(':slug')
  @ApiOperation({ summary: 'Get page by slug', description: 'Retrieve a published page by its slug' })
  @ApiParam({ name: 'slug', description: 'Page slug' })
  @ApiResponse({ status: 200, description: 'Page retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async findBySlug(@Req() req: Request, @Param('slug') slug: string): Promise<StandardSuccessResponse> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('pages');
    const ownerUserId = ownerSiteUserIdFromRequest(req);
    const normalizedSlug = String(slug).trim().toLowerCase();
    const slugFilter: Record<string, unknown> = {
      isPublished: true,
      $or: [{ slug: normalizedSlug }, { alias: normalizedSlug }],
    };
    if (ownerUserId && Types.ObjectId.isValid(ownerUserId)) {
      slugFilter.createdBy = new Types.ObjectId(ownerUserId);
    }

    const page = await collection.findOne(slugFilter);

    if (!page) {
      throw new NotFoundException({
        error: {
          code: 'not_found',
          message: 'Page not found',
        },
      });
    }

    return {
      data: {
        ...page,
        _id: page._id.toString(),
        createdBy: page.createdBy?.toString() || page.createdBy,
      },
    };
  }
}
