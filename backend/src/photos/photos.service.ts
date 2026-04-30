import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { IPhoto } from '../models/Photo';

@Injectable()
export class PhotosService {
  constructor(
    @InjectModel('Photo') private photoModel: Model<IPhoto>,
    @InjectConnection() private connection: Connection,
  ) {}

  /** Album _ids owned by this user (for owner-site public API scoping). */
  private async albumIdsForOwner(ownerSiteId: string): Promise<Types.ObjectId[]> {
    if (!Types.ObjectId.isValid(ownerSiteId)) return [];
    const oid = new Types.ObjectId(ownerSiteId);
    const col = this.connection.collection('albums');
    const rows = await col.find({ createdBy: oid }).project({ _id: 1 }).toArray();
    return rows.map((r) => r._id as Types.ObjectId);
  }

  /**
   * Get gallery-leading photos for hero/landing pages.
   * Prefer **`isGalleryLeading`** (explicit “homepage hero” in admin).
   * If none match, fall back to **`isLeading`** (album cover) so a single “leading”
   * checkbox is enough when operators use Album Cover only.
   * Always **`isPublished: true`**, newest first.
   */
  async findGalleryLeading(limit = 5, ownerSiteId?: string) {
    const base: Record<string, unknown> = { isPublished: true };
    if (ownerSiteId) {
      const albumIds = await this.albumIdsForOwner(ownerSiteId);
      if (albumIds.length === 0) return [];
      base.albumId = { $in: albumIds };
    }

    let photos = await this.photoModel
      .find({ ...base, isGalleryLeading: true })
      .sort({ uploadedAt: -1 })
      .limit(limit)
      .exec();

    if (photos.length === 0) {
      photos = await this.photoModel
        .find({ ...base, isLeading: true })
        .sort({ uploadedAt: -1 })
        .limit(limit)
        .exec();
    }

    return photos;
  }

  async findAll(page = 1, limit = 20, ownerSiteId?: string) {
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { isPublished: true };
    if (ownerSiteId) {
      const albumIds = await this.albumIdsForOwner(ownerSiteId);
      if (albumIds.length === 0) {
        return {
          photos: [],
          pagination: { page, limit, total: 0, pages: 0 },
        };
      }
      filter.albumId = { $in: albumIds };
    }

    const photos = await this.photoModel
      .find(filter)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('albumId', 'name alias')
      .populate('uploadedBy', 'name')
      .exec();

    const total = await this.photoModel.countDocuments(filter);

    return {
      photos,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 0,
      },
    };
  }

  async findOne(id: string, ownerSiteId?: string) {
    const photo = await this.photoModel
      .findById(id)
      .populate('albumId')
      .populate('tags')
      .populate('people')
      .populate('location')
      .populate('uploadedBy', 'name username')
      .exec();

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    if (ownerSiteId) {
      const album = photo.albumId as any;
      const createdByStr = album?.createdBy?.toString?.() ?? album?.createdBy;
      if (!createdByStr || createdByStr !== ownerSiteId) {
        throw new NotFoundException('Photo not found');
      }
    }

    return photo;
  }
}
