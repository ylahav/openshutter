import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Req,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { PhotosService } from './photos.service';
import { PhotoUploadService } from '../services/photo-upload';
import { FileUploadInterceptor } from '../common/interceptors/file-upload.interceptor';

@Controller('photos')
export class PhotosController {
  private readonly logger = new Logger(PhotosController.name);
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
    @Query('replaceIfExists') replaceIfExists?: string,
    @Body('albumId') bodyAlbumId?: string,
    @Body('title') bodyTitle?: string,
    @Body('description') bodyDescription?: string,
    @Body('tags') bodyTags?: string | string[],
    @Body('replaceIfExists') bodyReplaceIfExists?: boolean | string,
    @Req() request?: Request,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Also try to get albumId from request.body (multer stores FormData fields there)
    const requestBodyAlbumId = request?.body?.albumId;
    const resolvedAlbumId = albumId || bodyAlbumId || requestBodyAlbumId;
    const resolvedTitle = title || bodyTitle;
    const resolvedDescription = description || bodyDescription;
    const rawTags = tags || bodyTags;
    
    this.logger.debug(`[Photo Upload Controller] Upload parameters: ${JSON.stringify({
      queryAlbumId: albumId,
      bodyAlbumId: bodyAlbumId,
      requestBodyAlbumId: requestBodyAlbumId,
      resolvedAlbumId: resolvedAlbumId,
      title: resolvedTitle,
      filename: file.originalname,
      size: file.size,
      requestBodyKeys: request?.body ? Object.keys(request.body) : []
    })}`);
    
    let parsedTags: string[] = [];
    if (Array.isArray(rawTags)) {
      parsedTags = rawTags;
    } else if (typeof rawTags === 'string' && rawTags.length > 0) {
      try {
        parsedTags = JSON.parse(rawTags);
      } catch {
        parsedTags = rawTags.split(',').map((value) => value.trim()).filter(Boolean);
      }
    }

    // Parse replaceIfExists flag (can come from query, body, or request.body)
    const requestBodyReplaceIfExists = request?.body?.replaceIfExists;
    const replaceIfExistsValue = bodyReplaceIfExists !== undefined 
      ? bodyReplaceIfExists 
      : requestBodyReplaceIfExists !== undefined
        ? requestBodyReplaceIfExists === 'true' || requestBodyReplaceIfExists === true || requestBodyReplaceIfExists === '1'
        : replaceIfExists !== undefined 
          ? replaceIfExists === 'true' || replaceIfExists === '1'
          : false;
    
    const result = await this.photoUploadService.uploadPhoto(
      file.buffer,
      file.originalname,
      file.mimetype,
      {
        albumId: resolvedAlbumId,
        title: resolvedTitle,
        description: resolvedDescription,
        tags: parsedTags,
        replaceIfExists: replaceIfExistsValue === true || replaceIfExistsValue === 'true' || replaceIfExistsValue === '1',
      },
    );

    if (!result.success) {
      if (result.skipped) {
        // Return 200 with skipped status instead of error
        return {
          skipped: true,
          reason: result.reason,
          message: result.reason || 'Photo already exists'
        };
      }
      throw new BadRequestException(result.error || 'Upload failed');
    }

    return result.photo;
  }

  @Post('upload-from-folder')
  @HttpCode(HttpStatus.OK)
  async uploadFromFolder(
    @Body('folderPath') folderPath: string,
    @Body('albumId') albumId?: string,
    @Body('title') title?: string,
    @Body('description') description?: string,
    @Body('tags') tags?: string | string[],
  ) {
    if (!folderPath) {
      throw new BadRequestException('folderPath is required');
    }

    let parsedTags: string[] = [];
    if (Array.isArray(tags)) {
      parsedTags = tags;
    } else if (typeof tags === 'string' && tags.length > 0) {
      try {
        parsedTags = JSON.parse(tags);
      } catch {
        parsedTags = tags.split(',').map((value) => value.trim()).filter(Boolean);
      }
    }

    const report = await this.photoUploadService.uploadFromFolder(
      folderPath,
      {
        albumId,
        title,
        description,
        tags: parsedTags,
      }
    );

    return report;
  }
}
