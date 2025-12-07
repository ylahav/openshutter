import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { AlbumsService } from './albums.service';

@Controller('albums')
export class AlbumsController {
  constructor(private readonly albumsService: AlbumsService) {}

  @Get()
  async findAll(
    @Query('parentId') parentId?: string,
    @Query('level') level?: string,
  ) {
    return this.albumsService.findAll(parentId, level);
  }

  @Get('by-alias/:alias')
  async findByAlias(@Param('alias') alias: string) {
    return this.albumsService.findByAlias(alias);
  }

  @Get(':id/photos')
  async findPhotos(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) || 1 : 1;
    const limitNum = limit ? parseInt(limit, 10) || 50 : 50;
    return this.albumsService.findPhotosByAlbumId(id, pageNum, limitNum);
  }

  @Post('cover-images')
  async getCoverImages(@Body() body: { albumIds: string[] }) {
    return this.albumsService.getMultipleAlbumCoverImages(body.albumIds || []);
  }

  @Get(':id/cover-image')
  async getCoverImage(@Param('id') id: string) {
    return this.albumsService.getAlbumCoverImage(id);
  }

  @Get(':idOrAlias/data')
  async getAlbumData(
    @Param('idOrAlias') idOrAlias: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) || 1 : 1;
    const limitNum = limit ? parseInt(limit, 10) || 50 : 50;
    return this.albumsService.getAlbumData(idOrAlias, pageNum, limitNum);
  }

  @Get(':idOrAlias')
  async findOne(@Param('idOrAlias') idOrAlias: string) {
    return this.albumsService.findOneByIdOrAlias(idOrAlias);
  }
}
