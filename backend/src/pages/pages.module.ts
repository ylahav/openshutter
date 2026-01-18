import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PagesController } from './pages.controller';
import { PagesPublicController } from './pages-public.controller';
import { PageSchema } from '../models/Page';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Page', schema: PageSchema },
    ]),
  ],
  controllers: [PagesController, PagesPublicController],
  providers: [],
  exports: [],
})
export class PagesModule {}

