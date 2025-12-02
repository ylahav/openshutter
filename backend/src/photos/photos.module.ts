import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';
import { PhotoSchema } from '../models/Photo';
import { TagSchema } from '../models/Tag';
import { PersonSchema } from '../models/Person';
import { LocationSchema } from '../models/Location';
import { PhotoUploadService } from '../services/photo-upload';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Photo', schema: PhotoSchema },
      { name: 'Tag', schema: TagSchema },
      { name: 'Person', schema: PersonSchema },
      { name: 'Location', schema: LocationSchema },
    ]),
  ],
  controllers: [PhotosController],
  providers: [PhotosService, PhotoUploadService],
  exports: [PhotosService],
})
export class PhotosModule {}
