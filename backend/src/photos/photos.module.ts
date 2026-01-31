import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PhotosController } from './photos.controller';
import { PhotosAdminController } from './photos-admin.controller';
import { PhotosService } from './photos.service';
import { PhotoSchema } from '../models/Photo';
import { TagSchema } from '../models/Tag';
import { PersonSchema } from '../models/Person';
import { LocationSchema } from '../models/Location';
import { PhotoUploadService } from '../services/photo-upload';
import { AdminOrOwnerGuard } from '../common/guards/admin-or-owner.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Photo', schema: PhotoSchema },
      { name: 'Tag', schema: TagSchema },
      { name: 'Person', schema: PersonSchema },
      { name: 'Location', schema: LocationSchema },
    ]),
  ],
  controllers: [PhotosController, PhotosAdminController],
  providers: [PhotosService, PhotoUploadService, AdminOrOwnerGuard],
  exports: [PhotosService],
})
export class PhotosModule {}
