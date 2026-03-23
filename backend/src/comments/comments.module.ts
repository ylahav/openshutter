import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AlbumCommentSchema } from './album-comment.schema';
import { UserSchema } from '../models/User';
import { AlbumSchema } from '../models/Album';
import { PhotoSchema } from '../models/Photo';
import { InAppNotificationSchema } from './in-app-notification.schema';
import { AlbumTaskSchema } from './album-task.schema';
import { CollaborationActivitySchema } from './collaboration-activity.schema';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { AlbumsModule } from '../albums/albums.module';
import { OptionalAdminGuard } from '../common/guards/optional-admin.guard';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { CollaborationActivityService } from './collaboration-activity.service';
import { AlbumTasksService } from './album-tasks.service';
import { CollaborationController } from './collaboration.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'AlbumComment', schema: AlbumCommentSchema },
      { name: 'User', schema: UserSchema },
      { name: 'Album', schema: AlbumSchema },
      { name: 'Photo', schema: PhotoSchema },
      { name: 'InAppNotification', schema: InAppNotificationSchema },
      { name: 'AlbumTask', schema: AlbumTaskSchema },
      { name: 'CollaborationActivity', schema: CollaborationActivitySchema },
    ]),
    AlbumsModule,
  ],
  controllers: [CommentsController, NotificationsController, CollaborationController],
  providers: [
    OptionalAdminGuard,
    CollaborationActivityService,
    NotificationsService,
    AlbumTasksService,
    CommentsService,
  ],
  exports: [CommentsService, CollaborationActivityService, AlbumTasksService, NotificationsService],
})
export class CommentsModule {}
