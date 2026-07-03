import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import mongoose from 'mongoose'
import { IVideo } from '../models/Video'
import { AlbumsService, type AlbumAccessContext } from '../albums/albums.service'
import { storageManager } from '../services/storage'
import { resolveOwnerStorageContext } from '../services/storage/owner-storage-context'

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name)

  constructor(
    @InjectModel('Video') private videoModel: Model<IVideo>,
    private readonly albumsService: AlbumsService,
  ) {}

  private serialize(video: any): any {
    if (!video) return video
    return {
      ...video,
      _id: video._id?.toString?.() ?? String(video._id),
      albumId: video.albumId ? video.albumId.toString?.() ?? String(video.albumId) : null,
      uploadedBy: video.uploadedBy
        ? video.uploadedBy.toString?.() ?? String(video.uploadedBy)
        : null,
      tags: Array.isArray(video.tags)
        ? video.tags.map((t: any) => (t?._id ? String(t._id) : String(t)))
        : [],
      people: Array.isArray(video.people)
        ? video.people.map((p: any) => (p?._id ? String(p._id) : String(p)))
        : [],
      location: video.location
        ? video.location._id
          ? String(video.location._id)
          : String(video.location)
        : null,
    }
  }

  /**
   * Admin/owner fetch — bypasses the isPublished gate, ownership is enforced by the
   * controller (AdminOrOwnerGuard) and cross-checked here for owner role via album.createdBy.
   */
  async findOneForAdmin(id: string, userId: string, role: string): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Video not found: ${id}`)
    }
    const video = await this.videoModel.findById(id).lean().exec()
    if (!video) {
      throw new NotFoundException(`Video not found: ${id}`)
    }
    if (role !== 'admin' && video.albumId) {
      const album = await mongoose.connection.db
        ?.collection('albums')
        .findOne({ _id: new Types.ObjectId(String(video.albumId)) })
      if (!album || String(album.createdBy) !== String(userId)) {
        throw new ForbiddenException('Access denied')
      }
    }
    return this.serialize(video)
  }

  async update(
    id: string,
    userId: string,
    role: string,
    body: {
      title?: Record<string, string> | string
      description?: Record<string, string> | string
      tags?: string[]
      people?: string[]
      location?: string | null
      isPublished?: boolean
    },
  ): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Video not found: ${id}`)
    }
    const video = await this.videoModel.findById(id).lean().exec()
    if (!video) {
      throw new NotFoundException(`Video not found: ${id}`)
    }
    if (role !== 'admin' && video.albumId) {
      const album = await mongoose.connection.db
        ?.collection('albums')
        .findOne({ _id: new Types.ObjectId(String(video.albumId)) })
      if (!album || String(album.createdBy) !== String(userId)) {
        throw new ForbiddenException('Access denied')
      }
    }

    const update: Record<string, unknown> = { updatedAt: new Date() }

    if (body.title !== undefined) {
      if (typeof body.title === 'string') {
        update.title = { en: body.title.trim() }
      } else if (body.title && typeof body.title === 'object') {
        const t: Record<string, string> = {}
        for (const [k, v] of Object.entries(body.title)) {
          if (typeof v === 'string' && v.trim()) t[k] = v.trim()
        }
        if (Object.keys(t).length > 0) update.title = t
      }
    }
    if (body.description !== undefined) {
      if (typeof body.description === 'string') {
        update.description = { en: body.description.trim() }
      } else if (body.description && typeof body.description === 'object') {
        const d: Record<string, string> = {}
        for (const [k, v] of Object.entries(body.description)) {
          if (typeof v === 'string') d[k] = v.trim()
        }
        update.description = d
      } else {
        update.description = { en: '' }
      }
    }
    if (Array.isArray(body.tags)) {
      update.tags = body.tags
        .map((s) => (Types.ObjectId.isValid(String(s)) ? new Types.ObjectId(String(s)) : null))
        .filter((v): v is Types.ObjectId => v !== null)
    }
    if (Array.isArray(body.people)) {
      update.people = body.people
        .map((s) => (Types.ObjectId.isValid(String(s)) ? new Types.ObjectId(String(s)) : null))
        .filter((v): v is Types.ObjectId => v !== null)
    }
    if (body.location !== undefined) {
      update.location =
        body.location && Types.ObjectId.isValid(String(body.location))
          ? new Types.ObjectId(String(body.location))
          : null
    }
    if (typeof body.isPublished === 'boolean') {
      update.isPublished = body.isPublished
    }

    await this.videoModel.updateOne({ _id: new Types.ObjectId(id) }, { $set: update }).exec()
    const updated = await this.videoModel.findById(id).lean().exec()
    return this.serialize(updated)
  }

  async findOne(id: string, accessContext?: AlbumAccessContext | null): Promise<any> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Video not found: ${id}`)
    }
    const video = await this.videoModel.findById(id).lean().exec()
    if (!video || !video.isPublished) {
      throw new NotFoundException(`Video not found: ${id}`)
    }
    if (video.albumId) {
      const album = await mongoose.connection.db
        ?.collection('albums')
        .findOne({ _id: new Types.ObjectId(String(video.albumId)) })
      if (album && !(this.albumsService as any).canAccessAlbum?.(album, accessContext ?? null)) {
        throw new ForbiddenException('Access denied')
      }
    }
    return this.serialize(video)
  }

  async remove(id: string, userId: string, role: string): Promise<{ success: boolean }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Video not found: ${id}`)
    }
    const video = await this.videoModel.findById(id).lean().exec()
    if (!video) {
      throw new NotFoundException(`Video not found: ${id}`)
    }

    if (role !== 'admin') {
      // Owners may only delete videos in albums they created.
      const album = video.albumId
        ? await mongoose.connection.db
            ?.collection('albums')
            .findOne({ _id: new Types.ObjectId(String(video.albumId)) })
        : null
      if (!album || String(album.createdBy) !== String(userId)) {
        throw new ForbiddenException('Access denied')
      }
    }

    if (video.storage?.provider && video.storage?.path) {
      try {
        let storageCtx: Awaited<ReturnType<typeof resolveOwnerStorageContext>> = undefined
        if (video.albumId) {
          const album = await mongoose.connection.db
            ?.collection('albums')
            .findOne({ _id: new Types.ObjectId(String(video.albumId)) })
          storageCtx = await resolveOwnerStorageContext(
            album?.createdBy ? String(album.createdBy) : undefined,
          )
        }
        const storageService = await storageManager.getProvider(
          video.storage.provider as any,
          storageCtx,
        )
        await storageService.deleteFile(video.storage.path)
      } catch (e) {
        this.logger.warn(
          `VideosService: failed to delete file from storage for ${id}: ${e instanceof Error ? e.message : String(e)}`,
        )
      }
    }

    await this.videoModel.deleteOne({ _id: new Types.ObjectId(id) }).exec()

    if (video.albumId) {
      try {
        await mongoose.connection.db
          ?.collection('albums')
          .updateOne(
            { _id: new Types.ObjectId(String(video.albumId)) },
            { $inc: { videoCount: -1 } },
          )
      } catch (e) {
        this.logger.warn(
          `VideosService: failed to decrement album videoCount: ${e instanceof Error ? e.message : String(e)}`,
        )
      }
    }

    return { success: true }
  }

  /**
   * Fetch all videos for an album (returns serialized docs). Used by AlbumsService.getAlbumData
   * to bundle videos alongside photos.
   */
  async findByAlbum(albumId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(albumId)) return []
    const videos = await this.videoModel
      .find({ albumId: new Types.ObjectId(albumId), isPublished: true })
      .sort({ uploadedAt: -1 })
      .lean()
      .exec()
    return videos.map((v) => this.serialize(v))
  }
}
