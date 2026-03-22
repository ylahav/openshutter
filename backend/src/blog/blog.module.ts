import { Module } from '@nestjs/common';
import { BlogPublicController } from './blog-public.controller';

@Module({
  controllers: [BlogPublicController],
})
export class BlogModule {}
