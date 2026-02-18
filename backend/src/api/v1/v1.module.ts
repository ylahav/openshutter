import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiKeysModule } from '../../api-keys/api-keys.module';
import { AlbumsModule } from '../../albums/albums.module';
import { PhotosModule } from '../../photos/photos.module';
import { SearchModule } from '../../search/search.module';
import { UserSchema } from '../../models/User';
import { V1Controller } from './v1.controller';
import { V1AlbumsController } from './albums/v1-albums.controller';
import { V1PhotosController } from './photos/v1-photos.controller';
import { V1TagsController } from './tags/v1-tags.controller';
import { V1PeopleController } from './people/v1-people.controller';
import { V1LocationsController } from './locations/v1-locations.controller';
import { V1PagesController } from './pages/v1-pages.controller';
import { V1SearchController } from './search/v1-search.controller';

@Module({
  imports: [
    ApiKeysModule,
    AlbumsModule,
    PhotosModule,
    SearchModule,
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
  ],
  controllers: [
    V1Controller,
    V1AlbumsController,
    V1PhotosController,
    V1TagsController,
    V1PeopleController,
    V1LocationsController,
    V1PagesController,
    V1SearchController,
  ],
})
export class V1Module {}
