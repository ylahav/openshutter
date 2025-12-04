import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PagesController } from './pages.controller';
import { PageSchema } from '../models/Page';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Page', schema: PageSchema },
    ]),
  ],
  controllers: [PagesController],
  providers: [],
  exports: [],
})
export class PagesModule {}

