import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request } from 'express';
import { AlbumsService, AlbumAccessContext } from './albums.service';
import { OptionalAdminGuard } from '../common/guards/optional-admin.guard';
import { UpdateAlbumDto } from './dto/update-album.dto';

@Controller('albums')
@UseGuards(OptionalAdminGuard)
export class AlbumsController {
  constructor(
    private readonly albumsService: AlbumsService,
    @InjectModel('User') private userModel: Model<any>,
  ) {}

  private async getAccessContext(req: Request): Promise<AlbumAccessContext | null> {
    const user = (req as any).user;
    if (!user?.id) return null;
    const doc = await this.userModel.findById(user.id).select('groupAliases').lean().exec();
    if (!doc) return null;
    return {
      userId: user.id,
      groupAliases: Array.isArray(doc.groupAliases) ? doc.groupAliases : [],
    };
  }

  @Get()
  async findAll(
    @Req() req: Request,
    @Query('parentId') parentId?: string,
    @Query('level') level?: string,
    @Query('mine') mine?: string,
  ) {
    const accessContext = await this.getAccessContext(req);
    return this.albumsService.findAll(parentId, level, accessContext, mine === 'true');
  }

  @Get('by-alias/:alias')
  async findByAlias(@Req() req: Request, @Param('alias') alias: string) {
    const accessContext = await this.getAccessContext(req);
    return this.albumsService.findByAlias(alias, accessContext);
  }

  @Get('hierarchy')
  async getHierarchy(
    @Req() req: Request,
    @Query('includePrivate') includePrivate?: string,
  ) {
    const accessContext = await this.getAccessContext(req);
    return this.albumsService.getHierarchy(includePrivate === 'true', accessContext);
  }

  @Get(':id/photos')
  async findPhotos(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const accessContext = await this.getAccessContext(req);
    const pageNum = page ? parseInt(page, 10) || 1 : 1;
    const limitNum = limit ? parseInt(limit, 10) || 50 : 50;
    return this.albumsService.findPhotosByAlbumId(id, pageNum, limitNum, accessContext);
  }

  /**
   * Create a new album (owner or admin).
   * Owner can only use storage providers in their allowedStorageProviders.
   * Path: POST /api/albums
   */
  @Post()
  async createAlbum(@Req() req: Request, @Body() body: any) {
    const user = (req as any).user;
    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }
    if (user.role !== 'admin' && user.role !== 'owner') {
      throw new ForbiddenException('Only admin or owner can create albums');
    }
    if (user.role === 'owner') {
      const doc = await this.userModel.findById(user.id).select('allowedStorageProviders').lean().exec();
      const allowed: string[] = Array.isArray((doc as any)?.allowedStorageProviders)
        ? (doc as any).allowedStorageProviders
        : [];
      const provider = body?.storageProvider;
      if (!provider || !allowed.includes(provider)) {
        throw new ForbiddenException(
          'You can only create albums using storage providers assigned to your account'
        );
      }
    }
    return this.albumsService.createAlbum(body, user.id);
  }

  @Post('cover-images')
  async getCoverImages(@Req() req: Request, @Body() body: { albumIds: string[] }) {
    const accessContext = await this.getAccessContext(req);
    return this.albumsService.getMultipleAlbumCoverImages(body.albumIds || [], accessContext);
  }

  @Get(':id/cover-image')
  async getCoverImage(@Req() req: Request, @Param('id') id: string) {
    const accessContext = await this.getAccessContext(req);
    return this.albumsService.getAlbumCoverImage(id, accessContext);
  }

  @Get(':idOrAlias/data')
  async getAlbumData(
    @Req() req: Request,
    @Param('idOrAlias') idOrAlias: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const accessContext = await this.getAccessContext(req);
    const pageNum = page ? parseInt(page, 10) || 1 : 1;
    const limitNum = limit ? parseInt(limit, 10) || 50 : 50;
    return this.albumsService.getAlbumData(idOrAlias, pageNum, limitNum, accessContext);
  }

  @Get(':idOrAlias')
  async findOne(@Req() req: Request, @Param('idOrAlias') idOrAlias: string) {
    const accessContext = await this.getAccessContext(req);
    return this.albumsService.findOneByIdOrAlias(idOrAlias, accessContext);
  }

  /**
   * Update an album (owner: own albums only; admin: any album).
   * Requires authentication as admin or owner.
   * Path: PUT /api/albums/:id
   */
  @Put(':id')
  async updateAlbum(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateAlbumDto,
  ) {
    const user = (req as any).user;
    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }
    if (user.role !== 'admin' && user.role !== 'owner') {
      throw new ForbiddenException('Only admin or owner can update albums');
    }
    const accessContext = await this.getAccessContext(req);
    const album = await this.albumsService.findOneByIdOrAlias(id, accessContext);
    if (user.role === 'owner') {
      const createdByStr = album.createdBy?.toString?.() ?? (album as any).createdBy;
      if (createdByStr !== user.id) {
        throw new ForbiddenException('You can only edit albums you created');
      }
    }
    return this.albumsService.updateAlbum(id, body as any, {
      userId: user.id,
      role: user.role,
    });
  }
}
