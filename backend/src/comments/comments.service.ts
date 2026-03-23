import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AlbumsService, AlbumAccessContext } from '../albums/albums.service';
import { IAlbumComment } from './album-comment.schema';
import { IAlbum } from '../models/Album';
import { IPhoto } from '../models/Photo';
import { extractMentionUsernames } from './mention.util';
import { mailService } from '../services/mail.service';
import { NotificationsService } from './notifications.service';
import { CollaborationActivityService } from './collaboration-activity.service';
import { siteConfigService } from '../services/site-config';
import { productDisplayNameFromSiteConfig } from '../common/utils/product-display-name-from-site-config';

function displayNameFromUser(user: { username?: string; name?: Record<string, string> } | null): string {
  if (!user) return 'Unknown';
  const n = user.name;
  if (n && typeof n === 'object') {
    const first = n.en || n.he || Object.values(n).find((v) => typeof v === 'string' && v.trim());
    if (first) return String(first).trim();
  }
  return user.username || 'User';
}

function albumLevelPhotoFilter(): Record<string, unknown> {
  return { $or: [{ photoId: null }, { photoId: { $exists: false } }] };
}

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel('AlbumComment') private commentModel: Model<IAlbumComment>,
    @InjectModel('User') private userModel: Model<any>,
    @InjectModel('Album') private albumModel: Model<IAlbum>,
    @InjectModel('Photo') private photoModel: Model<IPhoto>,
    private readonly albumsService: AlbumsService,
    private readonly notificationsService: NotificationsService,
    private readonly activityService: CollaborationActivityService,
  ) {}

  private serializeRow(
    r: any,
    userById: Map<string, any>,
    viewerId?: string,
    includeReports = false,
  ) {
    const u = userById.get(r.authorId.toString());
    const reportedBy = Array.isArray(r.reportedBy) ? r.reportedBy : [];
    const reportCount = reportedBy.length;
    const hasReported = !!(viewerId && reportedBy.some((x: any) => x.userId?.toString() === viewerId));
    const base: Record<string, unknown> = {
      _id: r._id.toString(),
      body: r.body,
      hidden: r.hidden,
      createdAt: r.createdAt,
      parentCommentId: r.parentCommentId ? r.parentCommentId.toString() : null,
      photoId: r.photoId ? r.photoId.toString() : null,
      author: {
        id: r.authorId.toString(),
        username: u?.username ?? '',
        displayName: displayNameFromUser(u || null),
      },
    };
    const mentionIds: string[] = (r.mentionUserIds || []).map((x: any) => x.toString());
    base.mentionUserIds = mentionIds;
    if (includeReports) {
      base.reportCount = reportCount;
      base.hasReportedByViewer = hasReported;
    }
    return base;
  }

  async listForAlbum(
    albumKey: string,
    accessContext: AlbumAccessContext | null,
    opts: {
      includeHidden?: boolean;
      moderatorUserId?: string;
      isAdmin?: boolean;
      photoId?: string;
      viewerUserId?: string;
    },
  ) {
    const album = await this.albumsService.findOneByIdOrAlias(albumKey, accessContext);
    if (!album) {
      throw new NotFoundException('Album not found');
    }
    const albumOid = new Types.ObjectId(album._id.toString());
    const filter: Record<string, unknown> = { albumId: albumOid };
    const canModerate =
      opts.isAdmin ||
      (!!opts.moderatorUserId && album.createdBy?.toString() === opts.moderatorUserId);

    if (opts.photoId && Types.ObjectId.isValid(opts.photoId)) {
      filter.photoId = new Types.ObjectId(opts.photoId);
    } else {
      Object.assign(filter, albumLevelPhotoFilter());
    }

    if (!opts.includeHidden || !canModerate) {
      filter.hidden = false;
    }

    const rows = await this.commentModel.find(filter).sort({ createdAt: -1 }).limit(200).lean().exec();
    const byId = new Map(rows.map((r: any) => [r._id.toString(), r]));
    const canSeeHidden = canModerate && opts.includeHidden;
    const visible = canSeeHidden
      ? rows
      : rows.filter((r: any) => {
          if (r.hidden) return false;
          if (r.parentCommentId) {
            const parent = byId.get(r.parentCommentId.toString()) as any;
            if (parent?.hidden) return false;
          }
          return true;
        });

    const authorIds = [...new Set(visible.map((r: any) => r.authorId.toString()))];
    const mentionFlat = new Set<string>();
    for (const r of visible) {
      for (const m of r.mentionUserIds || []) {
        mentionFlat.add(m.toString());
      }
    }
    const allUserIds = [...new Set([...authorIds, ...mentionFlat])];
    const users = allUserIds.length
      ? await this.userModel
          .find({ _id: { $in: allUserIds.map((id) => new Types.ObjectId(id)) } })
          .select('username name')
          .lean()
          .exec()
      : [];
    const userById = new Map(users.map((u: any) => [u._id.toString(), u]));

    const alias = typeof (album as any).alias === 'string' ? (album as any).alias : '';

    return {
      albumId: album._id.toString(),
      albumAlias: alias,
      comments: visible.map((r) =>
        this.serializeRow(r, userById, opts.viewerUserId, canModerate),
      ),
    };
  }

  async createForAlbum(
    albumKey: string,
    accessContext: AlbumAccessContext | null,
    userId: string,
    dto: { body: string; parentCommentId?: string | null; photoId?: string | null },
  ) {
    if (!userId) {
      throw new UnauthorizedException('Sign in to post a comment');
    }
    const text = (dto.body ?? '').trim();
    if (!text) {
      throw new BadRequestException('Comment cannot be empty');
    }
    if (text.length > 4000) {
      throw new BadRequestException('Comment is too long (max 4000 characters)');
    }
    const album = await this.albumsService.findOneByIdOrAlias(albumKey, accessContext);
    if (!album) {
      throw new NotFoundException('Album not found');
    }
    const albumOid = new Types.ObjectId(album._id.toString());

    let photoOid: Types.ObjectId | null = null;
    if (dto.photoId && Types.ObjectId.isValid(dto.photoId)) {
      const photo = await this.photoModel.findById(dto.photoId).lean().exec();
      if (!photo || !photo.albumId || photo.albumId.toString() !== album._id.toString()) {
        throw new BadRequestException('Photo not in this album');
      }
      photoOid = new Types.ObjectId(dto.photoId);
    }

    let parentOid: Types.ObjectId | null = null;
    if (dto.parentCommentId && Types.ObjectId.isValid(dto.parentCommentId)) {
      const parent = await this.commentModel.findById(dto.parentCommentId).lean().exec();
      if (!parent || parent.albumId.toString() !== album._id.toString()) {
        throw new BadRequestException('Invalid parent comment');
      }
      if (parent.hidden) {
        throw new BadRequestException('Cannot reply to a hidden comment');
      }
      if (parent.parentCommentId) {
        throw new BadRequestException('Only one level of replies is supported');
      }
      const parentPhoto = parent.photoId ? parent.photoId.toString() : null;
      const childPhoto = photoOid ? photoOid.toString() : null;
      if (parentPhoto !== childPhoto) {
        throw new BadRequestException('Reply must be on the same thread (photo context)');
      }
      parentOid = new Types.ObjectId(dto.parentCommentId);
    }

    const names = extractMentionUsernames(text);
    const mentionUsers =
      names.length > 0
        ? await this.userModel
            .find({ username: { $in: names } })
            .select('_id username')
            .lean()
            .exec()
        : [];
    const mentionUserIds = mentionUsers
      .map((u: any) => u._id as Types.ObjectId)
      .filter((id) => id.toString() !== userId);

    const doc = await this.commentModel.create({
      albumId: albumOid,
      photoId: photoOid,
      authorId: new Types.ObjectId(userId),
      body: text,
      hidden: false,
      parentCommentId: parentOid,
      mentionUserIds,
      reportedBy: [],
    });

    const u = await this.userModel.findById(userId).select('username name').lean().exec();
    const authorName = displayNameFromUser(u || null);
    const albumAlias =
      typeof (album as any).alias === 'string' ? (album as any).alias : album._id.toString();
    const photoHash = photoOid ? `&photo=${photoOid.toString()}` : '';
    const linkPath = `/albums/${encodeURIComponent(albumAlias)}#comments${photoHash}`;

    const actType = parentOid ? 'comment_reply' : 'comment_added';
    await this.activityService.log(album._id.toString(), actType, userId, {
      commentId: doc._id.toString(),
      snippet: text.slice(0, 160),
      photoId: photoOid ? photoOid.toString() : null,
    });

    const siteTitle = await siteConfigService.getConfig().then((c) => productDisplayNameFromSiteConfig(c, 'en'));
    const snippet = text.length > 120 ? `${text.slice(0, 117)}...` : text;

    for (const mu of mentionUsers) {
      const mid = (mu as any)._id.toString();
      if (mid === userId) continue;
      const uname = (mu as any).username as string;
      await this.notificationsService.createMention({
        userId: mid,
        title: `${authorName} mentioned you`,
        body: snippet,
        linkPath,
      });
      await mailService.sendRawIfConfigured(
        uname,
        `${siteTitle}: mentioned by ${authorName}`,
        `${authorName} mentioned you in a comment on an album.\n\n${snippet}\n\nOpen: ${process.env.FRONTEND_URL || process.env.EMAIL_BASE_URL || ''}${linkPath}`,
      );
    }

    const userById = new Map([[userId, u]].filter((x) => x[1]) as any);
    const row = doc.toObject();
    return this.serializeRow(row, userById as any, userId, false);
  }

  async setHidden(
    commentId: string,
    hidden: boolean,
    accessContext: AlbumAccessContext | null,
    user: { id: string; role: string } | null,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('Invalid comment id');
    }
    const comment = await this.commentModel.findById(commentId).exec();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    const album = await this.albumModel.findById(comment.albumId).lean().exec();
    if (!album) {
      throw new NotFoundException('Album not found');
    }
    const isAdmin = user.role === 'admin';
    const isAlbumOwner = album.createdBy?.toString() === user.id;
    if (!isAdmin && !isAlbumOwner) {
      throw new ForbiddenException('Only an admin or the album owner can hide comments');
    }
    comment.hidden = hidden;
    await comment.save();
    return { _id: comment._id.toString(), hidden: comment.hidden };
  }

  async reportComment(
    commentId: string,
    accessContext: AlbumAccessContext | null,
    userId: string,
  ): Promise<{ ok: boolean; reportCount: number }> {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('Invalid comment id');
    }
    const comment = await this.commentModel.findById(commentId).exec();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    const album = await this.albumsService.findOneByIdOrAlias(comment.albumId.toString(), accessContext);
    if (!album) {
      throw new ForbiddenException('Access denied');
    }
    const uid = new Types.ObjectId(userId);
    const already = (comment.reportedBy || []).some((r: any) => r.userId?.toString() === userId);
    if (already) {
      return { ok: true, reportCount: comment.reportedBy?.length ?? 0 };
    }
    comment.reportedBy = [...(comment.reportedBy || []), { userId: uid, createdAt: new Date() }];
    await comment.save();
    return { ok: true, reportCount: comment.reportedBy.length };
  }
}
