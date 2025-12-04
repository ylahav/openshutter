import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TagsController } from './tags.controller';
import { TagSchema } from '../models/Tag';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Tag', schema: TagSchema },
    ]),
  ],
  controllers: [TagsController],
  providers: [],
  exports: [],
})
export class TagsModule {}

