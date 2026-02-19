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
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiSecurity } from '@nestjs/swagger';
import { Request } from 'express';
import { AlbumsService, AlbumAccessContext } from '../../../albums/albums.service';
import { ApiKeyGuard } from '../../../api-keys/guards/api-key.guard';
import { ApiScopeGuard } from '../../../api-keys/guards/api-scope.guard';
import { ApiScope } from '../../../api-keys/decorators/api-scope.decorator';
import { RateLimitInterceptor } from '../../../api-keys/interceptors/rate-limit.interceptor';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StandardSuccessResponse } from '../dto/standard-error.dto';

@ApiTags('albums')
@ApiSecurity('apiKey')
@Controller('v1/albums')
@UseGuards(ApiKeyGuard, ApiScopeGuard)
@UseInterceptors(RateLimitInterceptor)
@ApiScope('albums:read', 'read')
export class V1AlbumsController {
  constructor(
    private readonly albumsService: AlbumsService,
    @InjectModel('User') private userModel: Model<any>,
  ) {}

  /**
   * Get access context from API key
   */
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
   * List albums
   * GET /api/v1/albums
   */
  @Get()
  @ApiOperation({ summary: 'List albums', description: 'Get a list of albums accessible to your API key' })
  @ApiQuery({ name: 'parentId', required: false, description: 'Filter by parent album ID' })
  @ApiQuery({ name: 'level', required: false, description: 'Filter by album level' })
  @ApiResponse({ status: 200, description: 'Albums retrieved successfully' })
  async findAll(
    @Req() req: Request,
    @Query('parentId') parentId?: string,
    @Query('level') level?: string,
  ): Promise<StandardSuccessResponse> {
    const accessContext = await this.getAccessContext(req);
    const albums = await this.albumsService.findAll(parentId, level, accessContext, false);

    return {
      data: albums,
    };
  }

  /**
   * Get album by ID
   * GET /api/v1/albums/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get album by ID', description: 'Retrieve details of a specific album' })
  @ApiParam({ name: 'id', description: 'Album ID' })
  @ApiResponse({ status: 200, description: 'Album retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Album not found' })
  async findOne(@Req() req: Request, @Param('id') id: string): Promise<StandardSuccessResponse> {
    const accessContext = await this.getAccessContext(req);
    const album = await this.albumsService.findOneByIdOrAlias(id, accessContext);

    if (!album) {
      throw new NotFoundException({
        error: {
          code: 'not_found',
          message: 'Album not found',
        },
      });
    }

    return {
      data: album,
    };
  }

  /**
   * Get album by alias
   * GET /api/v1/albums/by-alias/:alias
   */
  @Get('by-alias/:alias')
  @ApiOperation({ summary: 'Get album by alias', description: 'Retrieve album details using its alias (slug)' })
  @ApiParam({ name: 'alias', description: 'Album alias (slug)' })
  @ApiResponse({ status: 200, description: 'Album retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Album not found' })
  async findByAlias(
    @Req() req: Request,
    @Param('alias') alias: string,
  ): Promise<StandardSuccessResponse> {
    const accessContext = await this.getAccessContext(req);
    const album = await this.albumsService.findByAlias(alias, accessContext);

    if (!album) {
      throw new NotFoundException({
        error: {
          code: 'not_found',
          message: 'Album not found',
        },
      });
    }

    return {
      data: album,
    };
  }

  /**
   * Get photos in an album
   * GET /api/v1/albums/:id/photos
   */
  @Get(':id/photos')
  @ApiOperation({ summary: 'Get photos in album', description: 'Retrieve all photos in a specific album' })
  @ApiParam({ name: 'id', description: 'Album ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 50)' })
  @ApiResponse({ status: 200, description: 'Photos retrieved successfully' })
  async findPhotos(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<StandardSuccessResponse> {
    const accessContext = await this.getAccessContext(req);
    const pageNum = page ? parseInt(page, 10) || 1 : 1;
    const limitNum = limit ? parseInt(limit, 10) || 50 : 50;

    const result = await this.albumsService.findPhotosByAlbumId(id, pageNum, limitNum, accessContext);

    return {
      data: result.photos || [],
      meta: {
        page: pageNum,
        limit: limitNum,
        total: result.pagination?.total ?? 0,
        pages: result.pagination?.pages ?? 0,
      },
    };
  }
}
