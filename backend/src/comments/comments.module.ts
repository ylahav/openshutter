import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlbumCommentSchema } from './album-comment.schema';
import { UserSchema } from '../models/User';
import { AlbumSchema } from '../models/Album';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { AlbumsModule } from '../albums/albums.module';
import { OptionalAdminGuard } from '../common/guards/optional-admin.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'AlbumComment', schema: AlbumCommentSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Album', schema: AlbumSchema },
    ]),
    AlbumsModule,
  ],
  controllers: [CommentsController],
  providers: [CommentsService, OptionalAdminGuard],
  exports: [CommentsService],
})
export class CommentsModule {}
