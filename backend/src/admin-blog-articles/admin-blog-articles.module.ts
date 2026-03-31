import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminBlogArticlesController } from './admin-blog-articles.controller';
import { AdminGuard } from '../common/guards/admin.guard';

@Module({
  imports: [ConfigModule],
  controllers: [AdminBlogArticlesController],
  providers: [AdminGuard],
})
export class AdminBlogArticlesModule {}
