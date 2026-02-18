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
import { Request } from 'express';
import { AlbumsService, AlbumAccessContext } from '../../../albums/albums.service';
import { ApiKeyGuard } from '../../../api-keys/guards/api-key.guard';
import { ApiScopeGuard } from '../../../api-keys/guards/api-scope.guard';
import { ApiScope } from '../../../api-keys/decorators/api-scope.decorator';
import { RateLimitInterceptor } from '../../../api-keys/interceptors/rate-limit.interceptor';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StandardSuccessResponse } from '../dto/standard-error.dto';

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
  async findOne(@Req() req: Request, @Param('id') id: string): Promise<StandardSuccessResponse> {
    const accessContext = await this.getAccessContext(req);
    const album = await this.albumsService.findById(id, accessContext);

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
        total: result.total || 0,
        pages: result.pages || 0,
      },
    };
  }
}
