import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlbumSchema } from '../models/Album';
import { PhotoSchema } from '../models/Photo';
import { TagSchema } from '../models/Tag';
import { PersonSchema } from '../models/Person';
import { LocationSchema } from '../models/Location';
import { PageSchema } from '../models/Page';
import { StorageRestoreScanCacheSchema } from '../models/StorageRestoreScanCache';
import { MigrationService } from './migration.service';
import { MigrationController } from './migration.controller';
import { StorageRestoreService } from './storage-restore.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Album', schema: AlbumSchema },
      { name: 'Photo', schema: PhotoSchema },
      { name: 'Tag', schema: TagSchema },
      { name: 'Person', schema: PersonSchema },
      { name: 'Location', schema: LocationSchema },
      { name: 'Page', schema: PageSchema },
      { name: 'StorageRestoreScanCache', schema: StorageRestoreScanCacheSchema },
    ]),
  ],
  controllers: [MigrationController],
  providers: [MigrationService, StorageRestoreService],
  exports: [MigrationService, StorageRestoreService],
})
export class MigrationModule {}
