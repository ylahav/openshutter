import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MarketplaceListingSchema } from './marketplace.schema';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceAdminController } from './marketplace-admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'MarketplaceListing', schema: MarketplaceListingSchema },
    ]),
  ],
  controllers: [MarketplaceController, MarketplaceAdminController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
