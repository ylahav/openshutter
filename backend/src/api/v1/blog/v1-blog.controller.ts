import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiSecurity } from '@nestjs/swagger';
import mongoose from 'mongoose';
import { connectDB } from '../../../config/db';
import { ApiKeyGuard } from '../../../api-keys/guards/api-key.guard';
import { ApiScopeGuard } from '../../../api-keys/guards/api-scope.guard';
import { ApiScope } from '../../../api-keys/decorators/api-scope.decorator';
import { RateLimitInterceptor } from '../../../api-keys/interceptors/rate-limit.interceptor';
import { StandardSuccessResponse } from '../dto/standard-error.dto';
import { ownerSiteUserIdFromRequest } from '../../../common/utils/owner-site-from-request.util';

const BLOG_COLLECTION = 'blogarticles';

@ApiTags('blog')
@ApiSecurity('apiKey')
@Controller('v1/blog')
@UseGuards(ApiKeyGuard, ApiScopeGuard)
@UseInterceptors(RateLimitInterceptor)
@ApiScope('blog:read', 'read')
export class V1BlogController {
  /**
   * List published blog articles
   * GET /api/v1/blog
   */
  @Get()
  @ApiOperation({
    summary: 'List blog articles',
    description: 'Get a paginated list of published blog articles (scoped on owner custom domains)',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiResponse({ status: 200, description: 'Articles retrieved successfully' })
  async findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
  ): Promise<StandardSuccessResponse> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '50', 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const ownerUserId = ownerSiteUserIdFromRequest(req);
    const filter: Record<string, unknown> = { isPublished: true };
    if (ownerUserId) {
      filter.authorId = ownerUserId;
    }
    if (category && String(category).trim()) {
      filter.category = String(category).trim();
    }

    const collection = db.collection(BLOG_COLLECTION);
    const [articles, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      collection.countDocuments(filter),
    ]);

    const data = articles.map((a) => ({
      ...a,
      _id: a._id.toString(),
    }));

    return {
      data,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 0,
      },
    };
  }

  /**
   * Get article by slug
   * GET /api/v1/blog/:slug
   */
  @Get(':slug')
  @ApiOperation({ summary: 'Get blog article by slug' })
  @ApiParam({ name: 'slug' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findBySlug(@Req() req: Request, @Param('slug') slug: string): Promise<StandardSuccessResponse> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const normalizedSlug = String(slug).trim().toLowerCase();
    const ownerUserId = ownerSiteUserIdFromRequest(req);
    const filter: Record<string, unknown> = {
      slug: normalizedSlug,
      isPublished: true,
    };
    if (ownerUserId) {
      filter.authorId = ownerUserId;
    }

    const collection = db.collection(BLOG_COLLECTION);
    const article = await collection.findOne(filter);

    if (!article) {
      throw new NotFoundException({
        error: {
          code: 'not_found',
          message: 'Article not found',
        },
      });
    }

    return {
      data: {
        ...article,
        _id: article._id.toString(),
      },
    };
  }
}
