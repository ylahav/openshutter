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

function displayNameFromUser(user: { username?: string; name?: Record<string, string> } | null): string {
  if (!user) return 'Unknown';
  const n = user.name;
  if (n && typeof n === 'object') {
    const first = n.en || n.he || Object.values(n).find((v) => typeof v === 'string' && v.trim());
    if (first) return String(first).trim();
  }
  return user.username || 'User';
}

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel('AlbumComment') private commentModel: Model<IAlbumComment>,
    @InjectModel('User') private userModel: Model<any>,
    @InjectModel('Album') private albumModel: Model<IAlbum>,
    private readonly albumsService: AlbumsService,
  ) {}

  async listForAlbum(
    albumKey: string,
    accessContext: AlbumAccessContext | null,
    opts: { includeHidden?: boolean; moderatorUserId?: string; isAdmin?: boolean },
  ) {
    const album = await this.albumsService.findOneByIdOrAlias(albumKey, accessContext);
    if (!album) {
      throw new NotFoundException('Album not found');
    }
    const albumId = new Types.ObjectId(album._id.toString());
    const filter: Record<string, unknown> = { albumId };
    const canModerate =
      opts.isAdmin ||
      (!!opts.moderatorUserId && album.createdBy?.toString() === opts.moderatorUserId);
    if (!opts.includeHidden || !canModerate) {
      filter.hidden = false;
    }
    const rows = await this.commentModel.find(filter).sort({ createdAt: -1 }).limit(200).lean().exec();
    const authorIds = [...new Set(rows.map((r) => r.authorId.toString()))];
    const users = await this.userModel
      .find({ _id: { $in: authorIds.map((id) => new Types.ObjectId(id)) } })
      .select('username name')
      .lean()
      .exec();
    const byId = new Map(users.map((u: any) => [u._id.toString(), u]));
    return {
      albumId: album._id.toString(),
      comments: rows.map((r) => {
        const u = byId.get(r.authorId.toString());
        return {
          _id: r._id.toString(),
          body: r.body,
          hidden: r.hidden,
          createdAt: r.createdAt,
          author: {
            id: r.authorId.toString(),
            username: u?.username ?? '',
            displayName: displayNameFromUser(u || null),
          },
        };
      }),
    };
  }

  async createForAlbum(
    albumKey: string,
    accessContext: AlbumAccessContext | null,
    userId: string,
    body: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Sign in to post a comment');
    }
    const text = (body ?? '').trim();
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
    const doc = await this.commentModel.create({
      albumId: new Types.ObjectId(album._id.toString()),
      authorId: new Types.ObjectId(userId),
      body: text,
      hidden: false,
    });
    const u = await this.userModel.findById(userId).select('username name').lean().exec();
    return {
      _id: doc._id.toString(),
      body: doc.body,
      hidden: doc.hidden,
      createdAt: doc.createdAt,
      author: {
        id: userId,
        username: u?.username ?? '',
        displayName: displayNameFromUser(u || null),
      },
    };
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
}
