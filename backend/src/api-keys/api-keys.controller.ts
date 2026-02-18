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
import { Request } from 'express';
import { ApiKeyService, CreateApiKeyDto } from './api-key.service';
import { OptionalAdminGuard } from '../common/guards/optional-admin.guard';

@Controller('api-keys')
@UseGuards(OptionalAdminGuard)
export class ApiKeysController {
  constructor(private apiKeyService: ApiKeyService) {}

  /**
   * Get all API keys for the current user
   * GET /api/api-keys
   */
  @Get()
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
