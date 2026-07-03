import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request } from 'express'
import { FileInterceptor } from '@nestjs/platform-express'
import { AdminOrOwnerGuard } from '../common/guards/admin-or-owner.guard'
import { VideosService } from './videos.service'
import { VideoUploadService } from '../services/video-upload'
import type { MulterIncomingFile } from '../common/types/multer-incoming-file'
import type { AlbumAccessContext } from '../albums/albums.service'

const MAX_VIDEO_SIZE = 500 * 1024 * 1024 // 500MB

/**
 * MP4-family container check: bytes 4..7 must be "ftyp", brand at 8..11 must be a
 * known MP4 brand. Rejects QuickTime `qt  ` and non-MP4 containers so playback in
 * the browser stays reliable without transcoding.
 */
const ACCEPTED_MP4_BRANDS = new Set([
  'isom',
  'iso2',
  'iso4',
  'iso5',
  'iso6',
  'iso7',
  'iso8',
  'iso9',
  'mp41',
  'mp42',
  'avc1',
  'dash',
  'mmp4',
  'M4V ',
])

function isMp4Buffer(buf: Buffer): boolean {
  if (!buf || buf.length < 12) return false
  const ftyp = buf.slice(4, 8).toString('ascii')
  if (ftyp !== 'ftyp') return false
  const brand = buf.slice(8, 12).toString('ascii')
  return ACCEPTED_MP4_BRANDS.has(brand)
}

@Controller('videos')
export class VideosController {
  private readonly logger = new Logger(VideosController.name)

  constructor(
    private readonly videosService: VideosService,
    private readonly videoUploadService: VideoUploadService,
  ) {}

  private accessContextFromReq(req: Request): AlbumAccessContext | null {
    const siteContext = (req as any).siteContext as
      | { type?: string; ownerId?: string }
      | undefined
    const user = (req as any).user as { id?: string } | undefined
    if (!user?.id) {
      if (siteContext?.type === 'owner-site') {
        return {
          userId: '',
          groupAliases: [],
          ownerSiteId: siteContext.ownerId as string,
        }
      }
      return null
    }
    return {
      userId: user.id,
      groupAliases: [],
      ownerSiteId:
        siteContext?.type === 'owner-site' ? (siteContext.ownerId as string) : undefined,
    }
  }

  @Get()
  async list(@Query('albumId') albumId?: string) {
    if (!albumId) return { data: [] as any[] }
    const videos = await this.videosService.findByAlbum(albumId)
    return { data: videos }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    return this.videosService.findOne(id, this.accessContextFromReq(req))
  }

  /**
   * Admin/owner variant that returns the doc even when unpublished — used by the
   * edit form. Ownership is enforced in the service (owners restricted to their
   * own albums).
   */
  @Get(':id/admin')
  @UseGuards(AdminOrOwnerGuard)
  async findOneForAdmin(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user as { id?: string; role?: string } | undefined
    if (!user?.id) {
      throw new BadRequestException('User not authenticated')
    }
    return this.videosService.findOneForAdmin(id, user.id, user.role || 'owner')
  }

  @Put(':id')
  @UseGuards(AdminOrOwnerGuard)
  async update(
    @Param('id') id: string,
    @Req() req: Request,
    @Body()
    body: {
      title?: Record<string, string> | string
      description?: Record<string, string> | string
      tags?: string[]
      people?: string[]
      location?: string | null
      isPublished?: boolean
    },
  ) {
    const user = (req as any).user as { id?: string; role?: string } | undefined
    if (!user?.id) {
      throw new BadRequestException('User not authenticated')
    }
    return this.videosService.update(id, user.id, user.role || 'owner', body)
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AdminOrOwnerGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_VIDEO_SIZE },
    }),
  )
  async upload(
    @UploadedFile() file: MulterIncomingFile,
    @Req() req: Request,
    @Body('albumId') bodyAlbumId?: string,
    @Body('title') bodyTitle?: string,
    @Body('description') bodyDescription?: string,
    @Body('duration') bodyDuration?: string,
    @Body('width') bodyWidth?: string,
    @Body('height') bodyHeight?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided')
    }
    if (!file.buffer) {
      throw new BadRequestException('File has no in-memory buffer; cannot upload')
    }
    if (file.mimetype !== 'video/mp4') {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Only video/mp4 is supported.`,
      )
    }
    if (!isMp4Buffer(file.buffer)) {
      throw new BadRequestException('File content is not a valid MP4 (H.264/AAC) container')
    }
    if (!bodyAlbumId) {
      throw new BadRequestException('albumId is required')
    }

    const user = (req as any).user as { id?: string } | undefined
    const duration =
      bodyDuration && Number.isFinite(Number(bodyDuration)) ? Number(bodyDuration) : undefined
    const width =
      bodyWidth && Number.isFinite(Number(bodyWidth)) ? Number(bodyWidth) : undefined
    const height =
      bodyHeight && Number.isFinite(Number(bodyHeight)) ? Number(bodyHeight) : undefined
    const dimensions =
      width !== undefined && height !== undefined ? { width, height } : undefined

    const result = await this.videoUploadService.uploadVideo(
      file.buffer,
      file.originalname,
      file.mimetype,
      {
        albumId: bodyAlbumId,
        title: bodyTitle,
        description: bodyDescription,
        uploadedBy: user?.id,
        duration,
        dimensions,
      },
    )

    if (!result.success) {
      if (result.skipped) {
        return { skipped: true, reason: result.reason, message: result.reason }
      }
      throw new BadRequestException(result.error || 'Upload failed')
    }

    return result.video
  }

  @Delete(':id')
  @UseGuards(AdminOrOwnerGuard)
  async remove(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user as { id?: string; role?: string } | undefined
    if (!user?.id) {
      throw new BadRequestException('User not authenticated')
    }
    return this.videosService.remove(id, user.id, user.role || 'owner')
  }
}
