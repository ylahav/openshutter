import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiSecurity } from '@nestjs/swagger';
import { connectDB } from '../../../config/db';
import mongoose, { Types } from 'mongoose';
import { ApiKeyGuard } from '../../../api-keys/guards/api-key.guard';
import { ApiScopeGuard } from '../../../api-keys/guards/api-scope.guard';
import { ApiScope } from '../../../api-keys/decorators/api-scope.decorator';
import { RateLimitInterceptor } from '../../../api-keys/interceptors/rate-limit.interceptor';
import { StandardSuccessResponse } from '../dto/standard-error.dto';

@ApiTags('tags')
@ApiSecurity('apiKey')
@Controller('v1/tags')
@UseGuards(ApiKeyGuard, ApiScopeGuard)
@UseInterceptors(RateLimitInterceptor)
@ApiScope('tags:read', 'read')
export class V1TagsController {
  /**
   * List all tags
   * GET /api/v1/tags
   */
  @Get()
  @ApiOperation({ summary: 'List tags', description: 'Get a paginated list of all tags' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 50)' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiResponse({ status: 200, description: 'Tags retrieved successfully' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
  ): Promise<StandardSuccessResponse> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('tags');
    const query: any = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '50', 10);
    const skip = (pageNum - 1) * limitNum;

    const [tags, total] = await Promise.all([
      collection.find(query).sort({ name: 1 }).skip(skip).limit(limitNum).toArray(),
      collection.countDocuments(query),
    ]);

    const serializedTags = tags.map((tag) => ({
      ...tag,
      _id: tag._id.toString(),
      createdBy: tag.createdBy?.toString() || tag.createdBy,
    }));

    return {
      data: serializedTags,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get tag by ID
   * GET /api/v1/tags/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get tag by ID', description: 'Retrieve details of a specific tag' })
  @ApiParam({ name: 'id', description: 'Tag ID' })
  @ApiResponse({ status: 200, description: 'Tag retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tag not found' })
  async findOne(@Param('id') id: string): Promise<StandardSuccessResponse> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('tags');
    const tag = await collection.findOne({ _id: new Types.ObjectId(id) });

    if (!tag) {
      throw new NotFoundException({
        error: {
          code: 'not_found',
          message: 'Tag not found',
        },
      });
    }

    return {
      data: {
        ...tag,
        _id: tag._id.toString(),
        createdBy: tag.createdBy?.toString() || tag.createdBy,
      },
    };
  }
}
