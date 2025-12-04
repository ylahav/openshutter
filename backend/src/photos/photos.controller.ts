import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PhotosService } from './photos.service';
import { PhotoUploadService } from '../services/photo-upload';
import { FileUploadInterceptor } from '../common/interceptors/file-upload.interceptor';

@Controller('photos')
export class PhotosController {
  constructor(
    private readonly photosService: PhotosService,
    private readonly photoUploadService: PhotoUploadService,
  ) {}

  @Get('gallery-leading')
  async findGalleryLeading(
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) || 5 : 5;
    // Return direct array, frontend handles shape
    return this.photosService.findGalleryLeading(limitNum);
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) || 1 : 1;
    const limitNum = limit ? parseInt(limit, 10) || 20 : 20;
    return this.photosService.findAll(pageNum, limitNum);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.photosService.findOne(id);
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    }),
    FileUploadInterceptor,
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('albumId') albumId?: string,
    @Query('title') title?: string,
    @Query('description') description?: string,
    @Query('tags') tags?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.photoUploadService.uploadPhoto(
      file.buffer,
      file.originalname,
      file.mimetype,
      {
        albumId,
        title,
        description,
        tags: tags ? JSON.parse(tags) : [],
      },
    );

    if (!result.success) {
      throw new BadRequestException(result.error || 'Upload failed');
    }

    return result.photo;
  }
}
