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
import { PhotoProcessingWorker } from '../services/photo-processing.worker';
import { AdminOrOwnerGuard } from '../common/guards/admin-or-owner.guard';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Photo', schema: PhotoSchema },
      { name: 'Tag', schema: TagSchema },
      { name: 'Person', schema: PersonSchema },
      { name: 'Location', schema: LocationSchema },
    ]),
    AnalyticsModule,
  ],
  controllers: [PhotosController, PhotosAdminController],
  providers: [PhotosService, PhotoUploadService, PhotoProcessingWorker, AdminOrOwnerGuard],
  exports: [PhotosService],
})
export class PhotosModule {}
