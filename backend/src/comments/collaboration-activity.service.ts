import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AlbumsService, AlbumAccessContext } from '../albums/albums.service';
import { siteConfigService } from '../services/site-config';
import { canViewCollaborationService, resolveCollaborationVisibility } from './collaboration-feature.util';
import { CollaborationActivityType, ICollaborationActivity } from './collaboration-activity.schema';

@Injectable()
export class CollaborationActivityService {
  constructor(
    @InjectModel('CollaborationActivity') private activityModel: Model<ICollaborationActivity>,
    private readonly albumsService: AlbumsService,
  ) {}

  async log(
    albumId: string,
    type: CollaborationActivityType,
    actorUserId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.activityModel.create({
      albumId: new Types.ObjectId(albumId),
      type,
      actorUserId: new Types.ObjectId(actorUserId),
      payload: payload || {},
    });
  }

  async listForAlbum(
    albumKey: string,
    accessContext: AlbumAccessContext | null,
    limit = 30,
    opts?: { viewerUserId?: string; isAdmin?: boolean },
  ): Promise<{ albumId: string; events: unknown[] }> {
    const album = await this.albumsService.findOneByIdOrAlias(albumKey, accessContext);
    if (!album) {
      throw new NotFoundException('Album not found');
    }
    const cfg = await siteConfigService.getConfig();
    const vis = resolveCollaborationVisibility(cfg.features);
    const canModerate =
      opts?.isAdmin ||
      (!!opts?.viewerUserId && album.createdBy?.toString() === opts.viewerUserId);
    const isAuthed = !!opts?.viewerUserId;
    if (!canModerate && !canViewCollaborationService(vis, 'activity', isAuthed)) {
      return { albumId: album._id.toString(), events: [] };
    }
    const cap = Math.min(Math.max(limit, 1), 100);
    const rows = await this.activityModel
      .find({ albumId: new Types.ObjectId(album._id.toString()) })
      .sort({ createdAt: -1 })
      .limit(cap)
      .lean()
      .exec();
    return {
      albumId: album._id.toString(),
      events: rows.map((r) => ({
        _id: r._id.toString(),
        type: r.type,
        actorUserId: r.actorUserId.toString(),
        payload: r.payload,
        createdAt: r.createdAt,
      })),
    };
  }
}
