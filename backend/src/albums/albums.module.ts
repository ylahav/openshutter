import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlbumsController } from './albums.controller';
import { AlbumsService } from './albums.service';
import { AlbumSchema } from '../models/Album';
import { PhotoSchema } from '../models/Photo';
import { TagSchema } from '../models/Tag';
import { PersonSchema } from '../models/Person';
import { LocationSchema } from '../models/Location';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Album', schema: AlbumSchema },
      { name: 'Photo', schema: PhotoSchema },
      { name: 'Tag', schema: TagSchema },
      { name: 'Person', schema: PersonSchema },
      { name: 'Location', schema: LocationSchema },
    ]),
  ],
  controllers: [AlbumsController],
  providers: [AlbumsService],
  exports: [AlbumsService],
})
export class AlbumsModule {}
