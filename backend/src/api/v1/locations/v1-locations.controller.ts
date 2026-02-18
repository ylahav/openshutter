import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  NotFoundException,
} from '@nestjs/common';
import { connectDB } from '../../../config/db';
import mongoose, { Types } from 'mongoose';
import { ApiKeyGuard } from '../../../api-keys/guards/api-key.guard';
import { ApiScopeGuard } from '../../../api-keys/guards/api-scope.guard';
import { ApiScope } from '../../../api-keys/decorators/api-scope.decorator';
import { RateLimitInterceptor } from '../../../api-keys/interceptors/rate-limit.interceptor';
import { StandardSuccessResponse } from '../dto/standard-error.dto';

@Controller('v1/locations')
@UseGuards(ApiKeyGuard, ApiScopeGuard)
@UseInterceptors(RateLimitInterceptor)
@ApiScope('locations:read', 'read')
export class V1LocationsController {
  /**
   * List all locations
   * GET /api/v1/locations
   */
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<StandardSuccessResponse> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('locations');
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '50', 10);
    const skip = (pageNum - 1) * limitNum;

    const [locations, total] = await Promise.all([
      collection
        .find({ isActive: true })
        .sort({ name: 1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      collection.countDocuments({ isActive: true }),
    ]);

    const serializedLocations = locations.map((location) => ({
      ...location,
      _id: location._id.toString(),
      createdBy: location.createdBy?.toString() || location.createdBy,
    }));

    return {
      data: serializedLocations,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get location by ID
   * GET /api/v1/locations/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<StandardSuccessResponse> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('locations');
    const location = await collection.findOne({
      _id: new Types.ObjectId(id),
      isActive: true,
    });

    if (!location) {
      throw new NotFoundException({
        error: {
          code: 'not_found',
          message: 'Location not found',
        },
      });
    }

    return {
      data: {
        ...location,
        _id: location._id.toString(),
        createdBy: location.createdBy?.toString() || location.createdBy,
      },
    };
  }
}
