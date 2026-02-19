import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyService, CreateApiKeyDto } from './api-key.service';
import { OptionalAdminGuard } from '../common/guards/optional-admin.guard';

@ApiTags('api-keys')
@ApiBearerAuth()
@Controller('api-keys')
@UseGuards(OptionalAdminGuard)
export class ApiKeysController {
  constructor(private apiKeyService: ApiKeyService) {}

  /**
   * Get all API keys for the current user
   * GET /api/api-keys
   */
  @Get()
  @ApiOperation({ summary: 'List API keys', description: 'Get all API keys for the authenticated user' })
  @ApiResponse({ status: 200, description: 'API keys retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async getUserApiKeys(@Req() req: Request) {
    const user = (req as any).user;
    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const keys = await this.apiKeyService.getUserApiKeys(user.id);
    return { data: keys };
  }

  /**
   * Create a new API key
   * POST /api/api-keys
   */
  @Post()
  @ApiOperation({ 
    summary: 'Create API key', 
    description: 'Create a new API key. The full key will only be shown once on creation.' 
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'API key name' },
        description: { type: 'string', description: 'Optional description' },
        scopes: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Array of scopes (e.g., ["albums:read", "photos:read"])',
        },
        rateLimitTier: { 
          type: 'string', 
          enum: ['free', 'basic', 'pro', 'enterprise'],
          description: 'Rate limit tier',
        },
        expiresInDays: { type: 'number', description: 'Days until expiration (optional)' },
      },
      required: ['name', 'scopes'],
    },
  })
  @ApiResponse({ status: 201, description: 'API key created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async createApiKey(@Req() req: Request, @Body() body: Partial<CreateApiKeyDto>) {
    const user = (req as any).user;
    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!body.name || !body.scopes || !Array.isArray(body.scopes)) {
      throw new BadRequestException('name and scopes are required');
    }

    const dto: CreateApiKeyDto = {
      userId: user.id,
      name: body.name,
      description: body.description,
      scopes: body.scopes,
      rateLimitTier: body.rateLimitTier,
      expiresInDays: body.expiresInDays,
    };

    const apiKey = await this.apiKeyService.createApiKey(dto);
    return {
      data: apiKey,
      message: 'API key created successfully. Save this key securely - it will not be shown again.',
    };
  }

  /**
   * Get a single API key by ID
   * GET /api/api-keys/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get API key', description: 'Get details of a specific API key' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'API key retrieved successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async getApiKey(@Req() req: Request, @Param('id') id: string) {
    const user = (req as any).user;
    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const apiKey = await this.apiKeyService.getApiKeyById(id, user.id);
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return { data: apiKey };
  }

  /**
   * Update an API key
   * PUT /api/api-keys/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update API key', description: 'Update API key name, description, scopes, or tier' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'API key updated successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async updateApiKey(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: Partial<Pick<CreateApiKeyDto, 'name' | 'description' | 'scopes' | 'rateLimitTier'>>,
  ) {
    const user = (req as any).user;
    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const apiKey = await this.apiKeyService.updateApiKey(id, user.id, body);
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return { data: apiKey };
  }

  /**
   * Revoke (deactivate) an API key
   * DELETE /api/api-keys/:id
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Revoke API key', description: 'Deactivate an API key. It cannot be reactivated.' })
  @ApiParam({ name: 'id', description: 'API key ID' })
  @ApiResponse({ status: 200, description: 'API key revoked successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async revokeApiKey(@Req() req: Request, @Param('id') id: string) {
    const user = (req as any).user;
    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const success = await this.apiKeyService.revokeApiKey(id, user.id);
    if (!success) {
      throw new NotFoundException('API key not found');
    }

    return { message: 'API key revoked successfully' };
  }
}
