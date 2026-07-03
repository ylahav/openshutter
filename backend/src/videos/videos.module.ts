import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { VideosController } from './videos.controller'
import { VideosService } from './videos.service'
import { VideoSchema } from '../models/Video'
import { VideoUploadService } from '../services/video-upload'
import { AdminOrOwnerGuard } from '../common/guards/admin-or-owner.guard'
import { AlbumsModule } from '../albums/albums.module'

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: 'Video', schema: VideoSchema }]),
    AlbumsModule,
  ],
  controllers: [VideosController],
  providers: [VideosService, VideoUploadService, AdminOrOwnerGuard],
  exports: [VideosService],
})
export class VideosModule {}
