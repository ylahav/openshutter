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

@ApiTags('people')
@ApiSecurity('apiKey')
@Controller('v1/people')
@UseGuards(ApiKeyGuard, ApiScopeGuard)
@UseInterceptors(RateLimitInterceptor)
@ApiScope('people:read', 'read')
export class V1PeopleController {
  /**
   * List all people
   * GET /api/v1/people
   */
  @Get()
  @ApiOperation({ summary: 'List people', description: 'Get a paginated list of all active people' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 50)' })
  @ApiResponse({ status: 200, description: 'People retrieved successfully' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<StandardSuccessResponse> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('people');
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '50', 10);
    const skip = (pageNum - 1) * limitNum;

    const [people, total] = await Promise.all([
      collection
        .find({ isActive: true })
        .sort({ fullName: 1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      collection.countDocuments({ isActive: true }),
    ]);

    const serializedPeople = people.map((person) => ({
      ...person,
      _id: person._id.toString(),
      createdBy: person.createdBy?.toString() || person.createdBy,
    }));

    return {
      data: serializedPeople,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Get person by ID
   * GET /api/v1/people/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get person by ID', description: 'Retrieve details of a specific person' })
  @ApiParam({ name: 'id', description: 'Person ID' })
  @ApiResponse({ status: 200, description: 'Person retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  async findOne(@Param('id') id: string): Promise<StandardSuccessResponse> {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('people');
    const person = await collection.findOne({
      _id: new Types.ObjectId(id),
      isActive: true,
    });

    if (!person) {
      throw new NotFoundException({
        error: {
          code: 'not_found',
          message: 'Person not found',
        },
      });
    }

    return {
      data: {
        ...person,
        _id: person._id.toString(),
        createdBy: person.createdBy?.toString() || person.createdBy,
      },
    };
  }
}
