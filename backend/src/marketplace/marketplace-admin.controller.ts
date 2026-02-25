import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { MarketplaceService, CreateListingDto, UpdateListingDto } from './marketplace.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { OptionalAdminGuard } from '../common/guards/optional-admin.guard';

@Controller('admin/marketplace')
export class MarketplaceAdminController {
  constructor(private marketplaceService: MarketplaceService) {}

  /**
   * List all listings (admin: all; owner: can use submit flow)
   * GET /api/admin/marketplace
   */
  @Get()
  @UseGuards(AdminGuard)
  async listAll(@Query() query: { approved?: string }) {
    const approvedOnly = query.approved === 'true' ? true : query.approved === 'false' ? false : undefined;
    const listings = await this.marketplaceService.findAll(approvedOnly);
    return { data: listings };
  }

  /**
   * Get one listing (admin)
   */
  @Get(':id')
  @UseGuards(AdminGuard)
  async getOne(@Param('id') id: string) {
    const listing = await this.marketplaceService.findById(id);
    if (!listing) {
      return { data: null };
    }
    return { data: listing };
  }

  /**
   * Submit a new listing (owner or admin) - creates as pending
   * POST /api/admin/marketplace
   */
  @Post()
  @UseGuards(OptionalAdminGuard)
  async submit(@Req() req: Request, @Body() body: Partial<CreateListingDto>) {
    const user = (req as any).user;
    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!body.name?.trim() || !body.description?.trim() || !body.category || !body.developerName?.trim() || !body.developerEmail?.trim()) {
      throw new BadRequestException('name, description, category, developerName, and developerEmail are required');
    }
    const dto: CreateListingDto = {
      name: body.name.trim(),
      description: body.description.trim(),
      category: body.category as CreateListingDto['category'],
      developerName: body.developerName.trim(),
      developerEmail: body.developerEmail.trim(),
      version: body.version,
      apiVersionCompatible: body.apiVersionCompatible,
      screenshots: body.screenshots,
      documentationUrl: body.documentationUrl,
      downloadUrl: body.downloadUrl,
      repositoryUrl: body.repositoryUrl,
      tags: Array.isArray(body.tags) ? body.tags : typeof body.tags === 'string' ? (body.tags as string).split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    };
    const listing = await this.marketplaceService.create(dto, user.id);
    return { data: listing, message: 'Listing submitted. It will appear in the marketplace after admin approval.' };
  }

  /**
   * Update / approve a listing (admin)
   * PUT /api/admin/marketplace/:id
   */
  @Put(':id')
  @UseGuards(AdminGuard)
  async update(@Req() req: Request, @Param('id') id: string, @Body() body: UpdateListingDto) {
    const user = (req as any).user;
    const listing = await this.marketplaceService.update(id, body, user?.id);
    return { data: listing };
  }

  /**
   * Delete a listing (admin)
   */
  @Delete(':id')
  @UseGuards(AdminGuard)
  async delete(@Param('id') id: string) {
    await this.marketplaceService.delete(id);
    return { message: 'Listing deleted' };
  }
}
