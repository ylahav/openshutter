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
  ) {
    const listings = await this.marketplaceService.findApproved({
      category,
      featured: featured === 'true' ? true : undefined,
      q: q?.trim() || undefined,
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
