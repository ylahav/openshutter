import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlogCategoriesController } from './blog-categories.controller';
import { BlogCategorySchema } from '../models/BlogCategory';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'BlogCategory', schema: BlogCategorySchema },
    ]),
  ],
  controllers: [BlogCategoriesController],
  providers: [],
  exports: [],
})
export class BlogCategoriesModule {}
