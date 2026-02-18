import { Controller, Get } from '@nestjs/common';

/**
 * V1 API Controller
 * Base controller for /api/v1/* endpoints
 */
@Controller('v1')
export class V1Controller {
  @Get()
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
