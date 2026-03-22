import { Controller, Get, Param, Query } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceCategory } from './marketplace.schema';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private marketplaceService: MarketplaceService) {}

  @Get()
  async list(
    @Query('category') category?: MarketplaceCategory,
    @Query('featured') featured?: string,
    @Query('q') q?: string,
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
  ) {
    const limit = limitStr != null && limitStr !== '' ? Number.parseInt(limitStr, 10) : undefined;
    const offset = offsetStr != null && offsetStr !== '' ? Number.parseInt(offsetStr, 10) : undefined;
    const listings = await this.marketplaceService.findApproved({
      category,
      featured: featured === 'true' ? true : undefined,
      q: q?.trim() || undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : undefined,
    });
    return { data: listings };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const listing = await this.marketplaceService.findApprovedById(id);
    if (!listing) return { data: null };
    return { data: listing };
  }
}
