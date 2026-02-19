import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * V1 API Controller
 * Base controller for /api/v1/* endpoints
 */
@ApiTags('info')
@Controller('v1')
export class V1Controller {
  @Get()
  @ApiOperation({ summary: 'Get API information', description: 'Returns API version, status, and available endpoints' })
  @ApiResponse({ status: 200, description: 'API information retrieved successfully' })
  getInfo() {
    return {
      version: '1.0.0',
      status: 'active',
      documentation: '/api/v1/docs',
      endpoints: {
        albums: '/api/v1/albums',
        photos: '/api/v1/photos',
        tags: '/api/v1/tags',
        people: '/api/v1/people',
        locations: '/api/v1/locations',
        pages: '/api/v1/pages',
        search: '/api/v1/search',
      },
    };
  }
}
