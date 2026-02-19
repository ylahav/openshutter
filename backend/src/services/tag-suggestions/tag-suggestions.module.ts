import { Module } from '@nestjs/common';
import { TagSuggestionsService } from './tag-suggestions.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PhotoSchema } from '../../models/Photo';
import { TagSchema } from '../../models/Tag';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Photo', schema: PhotoSchema },
      { name: 'Tag', schema: TagSchema },
    ]),
  ],
  providers: [TagSuggestionsService],
  exports: [TagSuggestionsService],
})
export class TagSuggestionsModule {}
