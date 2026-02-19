import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiSecurity } from '@nestjs/swagger';
import { connectDB } from '../../../config/db';
import mongoose, { Types } from 'mongoose';
import { PhotosService } from '../../../photos/photos.service';
import { ApiKeyGuard } from '../../../api-keys/guards/api-key.guard';
import { ApiScopeGuard } from '../../../api-keys/guards/api-scope.guard';
import { ApiScope } from '../../../api-keys/decorators/api-scope.decorator';
import { RateLimitInterceptor } from '../../../api-keys/interceptors/rate-limit.interceptor';
import { StandardSuccessResponse } from '../dto/standard-error.dto';

@ApiTags('photos')
@ApiSecurity('apiKey')
@Controller('v1/photos')
@UseGuards(ApiKeyGuard, ApiScopeGuard)
@UseInterceptors(RateLimitInterceptor)
@ApiScope('photos:read', 'read')
export class V1PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  /**
   * List photos
   * GET /api/v1/photos
   */
  @Get()
  @ApiOperation({ summary: 'List photos', description: 'Get a paginated list of published photos' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Photos retrieved successfully' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<StandardSuccessResponse> {
    const pageNum = page ? parseInt(page, 10) || 1 : 1;
    const limitNum = limit ? parseInt(limit, 10) || 20 : 20;

    const result = await this.photosService.findAll(pageNum, limitNum);

    return {
      data: result.photos || [],
      meta: {
        page: pageNum,
        limit: limitNum,
        total: result.pagination?.total || 0,
        pages: result.pagination?.pages || 0,
      },
    };
  }

  /**
   * Get photo metadata
   * GET /api/v1/photos/:id/metadata
   * Must be defined before :id route
   */
  @Get(':id/metadata')
  @ApiOperation({ summary: 'Get photo metadata', description: 'Retrieve EXIF, IPTC, XMP, and other metadata for a photo' })
  @ApiParam({ name: 'id', description: 'Photo ID' })
  @ApiResponse({ status: 200, description: 'Photo metadata retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async getMetadata(@Param('id') id: string): Promise<StandardSuccessResponse> {
    try {
      const photo = await this.photosService.findOne(id);
      
      const photoAny = photo as { exif?: object; iptc?: object; xmp?: object; dimensions?: object; size?: number; mimeType?: string };
      return {
        data: {
          exif: photoAny.exif || {},
          iptc: photoAny.iptc || {},
          xmp: photoAny.xmp || {},
          dimensions: photoAny.dimensions || {},
          fileSize: photoAny.size || 0,
          mimeType: photoAny.mimeType || '',
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException({
          error: {
            code: 'not_found',
            message: 'Photo not found',
          },
        });
      }
      throw error;
    }
  }

  /**
   * Get photo by ID
   * GET /api/v1/photos/:id
   * Must be defined after specific routes like :id/metadata and :id/tags
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get photo by ID', description: 'Retrieve details of a specific photo' })
  @ApiParam({ name: 'id', description: 'Photo ID' })
  @ApiResponse({ status: 200, description: 'Photo retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async findOne(@Param('id') id: string): Promise<StandardSuccessResponse> {
    try {
      const photo = await this.photosService.findOne(id);
      return {
        data: photo,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException({
          error: {
            code: 'not_found',
            message: 'Photo not found',
          },
        });
      }
      throw error;
    }
  }

  /**
   * Add tags to a photo
   * POST /api/v1/photos/:id/tags
   * Must be defined before :id route
   */
  @Post(':id/tags')
  @ApiOperation({ summary: 'Add tags to photo', description: 'Add one or more tags to a photo. Requires tags:write scope.' })
  @ApiParam({ name: 'id', description: 'Photo ID' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        tagIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of tag IDs to add',
        },
      },
      required: ['tagIds'],
    },
  })
  @ApiResponse({ status: 200, description: 'Tags added successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Photo or tag not found' })
  @ApiScope('tags:write', 'write')
  async addTags(
    @Param('id') photoId: string,
    @Body() body: { tagIds: string[] },
  ): Promise<StandardSuccessResponse> {
    if (!body.tagIds || !Array.isArray(body.tagIds) || body.tagIds.length === 0) {
      throw new BadRequestException({
        error: {
          code: 'validation_error',
          message: 'tagIds array is required and must not be empty',
        },
      });
    }

    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const photosCollection = db.collection('photos');
    const tagsCollection = db.collection('tags');

    // Verify photo exists
    const photo = await photosCollection.findOne({ _id: new Types.ObjectId(photoId) });
    if (!photo) {
      throw new NotFoundException({
        error: {
          code: 'not_found',
          message: 'Photo not found',
        },
      });
    }

    // Verify all tags exist
    const tagObjectIds = body.tagIds.map((id) => new Types.ObjectId(id));
    const existingTags = await tagsCollection
      .find({ _id: { $in: tagObjectIds } })
      .toArray();

    if (existingTags.length !== body.tagIds.length) {
      throw new BadRequestException({
        error: {
          code: 'validation_error',
          message: 'One or more tags not found',
        },
      });
    }

    // Get current tags
    const currentTagIds = (photo.tags || []).map((id: any) => id.toString());

    // Add new tags (avoid duplicates)
    const newTagIds = [
      ...new Set([...currentTagIds, ...body.tagIds.map((id) => id.toString())]),
    ].map((id) => new Types.ObjectId(id));

    // Update photo
    await photosCollection.updateOne(
      { _id: new Types.ObjectId(photoId) },
      {
        $set: {
          tags: newTagIds,
          updatedAt: new Date(),
        },
      },
    );

    // Update tag usage counts
    const tagsToIncrement = body.tagIds.filter((id) => !currentTagIds.includes(id));
    if (tagsToIncrement.length > 0) {
      await tagsCollection.updateMany(
        { _id: { $in: tagsToIncrement.map((id) => new Types.ObjectId(id)) } },
        { $inc: { usageCount: 1 } },
      );
    }

    return {
      data: {
        message: 'Tags added successfully',
        photoId,
        addedTags: body.tagIds,
      },
    };
  }

  /**
   * Remove a tag from a photo
   * DELETE /api/v1/photos/:id/tags/:tagId
   */
  @Delete(':id/tags/:tagId')
  @ApiOperation({ summary: 'Remove tag from photo', description: 'Remove a tag from a photo. Requires tags:write scope.' })
  @ApiParam({ name: 'id', description: 'Photo ID' })
  @ApiParam({ name: 'tagId', description: 'Tag ID to remove' })
  @ApiResponse({ status: 200, description: 'Tag removed successfully' })
  @ApiResponse({ status: 400, description: 'Tag is not associated with photo' })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  @ApiScope('tags:write', 'write')
  async removeTag(
    @Param('id') photoId: string,
    @Param('tagId') tagId: string,
  ): Promise<StandardSuccessResponse> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const photosCollection = db.collection('photos');

    // Verify photo exists
    const photo = await photosCollection.findOne({ _id: new Types.ObjectId(photoId) });
    if (!photo) {
      throw new NotFoundException({
        error: {
          code: 'not_found',
          message: 'Photo not found',
        },
      });
    }

    // Get current tags
    const currentTagIds = (photo.tags || []).map((id: any) => id.toString());
    const tagIdStr = tagId.toString();

    if (!currentTagIds.includes(tagIdStr)) {
      throw new BadRequestException({
        error: {
          code: 'validation_error',
          message: 'Tag is not associated with this photo',
        },
      });
    }

    // Remove tag
    const updatedTagIds = currentTagIds
      .filter((id: string) => id !== tagIdStr)
      .map((id: string) => new Types.ObjectId(id));

    await photosCollection.updateOne(
      { _id: new Types.ObjectId(photoId) },
      {
        $set: {
          tags: updatedTagIds,
          updatedAt: new Date(),
        },
      },
    );

    // Decrement tag usage count
    const tagsCollection = db.collection('tags');
    await tagsCollection.updateOne(
      { _id: new Types.ObjectId(tagId) },
      { $inc: { usageCount: -1 } },
    );

    return {
      data: {
        message: 'Tag removed successfully',
        photoId,
        removedTag: tagId,
      },
    };
  }
}
