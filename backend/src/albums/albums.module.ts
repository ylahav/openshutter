import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlbumsController } from './albums.controller';
import { AlbumsAdminController } from './albums-admin.controller';
import { AlbumsService } from './albums.service';
import { AlbumSchema } from '../models/Album';
import { PhotoSchema } from '../models/Photo';
import { TagSchema } from '../models/Tag';
import { PersonSchema } from '../models/Person';
import { LocationSchema } from '../models/Location';
import { UserSchema } from '../models/User';
import { OptionalAdminGuard } from '../common/guards/optional-admin.guard';
import { AdminOrOwnerGuard } from '../common/guards/admin-or-owner.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Album', schema: AlbumSchema },
      { name: 'Photo', schema: PhotoSchema },
      { name: 'Tag', schema: TagSchema },
      { name: 'Person', schema: PersonSchema },
      { name: 'Location', schema: LocationSchema },
      { name: 'User', schema: UserSchema },
    ]),
  ],
  controllers: [AlbumsController, AlbumsAdminController],
  providers: [AlbumsService, OptionalAdminGuard, AdminOrOwnerGuard],
  exports: [AlbumsService],
})
export class AlbumsModule {}
