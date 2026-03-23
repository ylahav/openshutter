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
import { CollaborationActivityService } from './collaboration-activity.service';
import { AlbumTaskStatus, IAlbumTask } from './album-task.schema';

@Injectable()
export class AlbumTasksService {
  constructor(
    @InjectModel('AlbumTask') private taskModel: Model<IAlbumTask>,
    @InjectModel('Album') private albumModel: Model<any>,
    private readonly albumsService: AlbumsService,
    private readonly activityService: CollaborationActivityService,
  ) {}

  async listForAlbum(albumKey: string, accessContext: AlbumAccessContext | null) {
    const album = await this.albumsService.findOneByIdOrAlias(albumKey, accessContext);
    if (!album) {
      throw new NotFoundException('Album not found');
    }
    const rows = await this.taskModel
      .find({ albumId: new Types.ObjectId(album._id.toString()) })
      .sort({ status: 1, createdAt: -1 })
      .limit(100)
      .lean()
      .exec();
    return {
      albumId: album._id.toString(),
      tasks: rows.map((t) => ({
        _id: t._id.toString(),
        title: t.title,
        description: t.description,
        status: t.status,
        dueAt: t.dueAt,
        assignedToUserId: t.assignedToUserId?.toString() ?? null,
        createdBy: t.createdBy.toString(),
        approvalStatus: t.approvalStatus ?? 'none',
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    };
  }

  async create(
    albumKey: string,
    accessContext: AlbumAccessContext | null,
    userId: string,
    dto: {
      title?: string;
      description?: string;
      dueAt?: string;
      assignedToUserId?: string;
      approvalStatus?: string;
    },
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const title = (dto.title || '').trim();
    if (!title) {
      throw new BadRequestException('title is required');
    }
    const album = await this.albumsService.findOneByIdOrAlias(albumKey, accessContext);
    if (!album) {
      throw new NotFoundException('Album not found');
    }
    const approvalStatus =
      dto.approvalStatus === 'pending' || dto.approvalStatus === 'none' ? dto.approvalStatus : 'none';
    const doc = await this.taskModel.create({
      albumId: new Types.ObjectId(album._id.toString()),
      title,
      description: dto.description?.trim() || undefined,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
      assignedToUserId: dto.assignedToUserId && Types.ObjectId.isValid(dto.assignedToUserId)
        ? new Types.ObjectId(dto.assignedToUserId)
        : undefined,
      createdBy: new Types.ObjectId(userId),
      status: 'open' as AlbumTaskStatus,
      approvalStatus,
    });
    await this.activityService.log(album._id.toString(), 'task_created', userId, {
      taskId: doc._id.toString(),
      title,
    });
    return { _id: doc._id.toString(), title: doc.title, status: doc.status, approvalStatus: doc.approvalStatus };
  }

  async update(
    taskId: string,
    accessContext: AlbumAccessContext | null,
    user: { id: string; role: string } | null,
    dto: Partial<{ status: AlbumTaskStatus; approvalStatus: 'none' | 'pending' | 'approved' | 'rejected' }>,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }
    const task = await this.taskModel.findById(taskId).exec();
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const album = await this.albumModel.findById(task.albumId).lean().exec();
    if (!album) {
      throw new NotFoundException('Album not found');
    }
    const albumDoc = await this.albumsService.findOneByIdOrAlias(task.albumId.toString(), accessContext);
    if (!albumDoc) {
      throw new ForbiddenException('Access denied');
    }
    const isAdmin = user.role === 'admin';
    const isAlbumOwner = album.createdBy?.toString() === user.id;
    const isCreator = task.createdBy.toString() === user.id;
    const isAssignee =
      task.assignedToUserId && task.assignedToUserId.toString() === user.id;

    if (dto.status !== undefined) {
      if (dto.status !== 'open' && dto.status !== 'done') {
        throw new BadRequestException('Invalid status');
      }
      if (!isAdmin && !isAlbumOwner && !isCreator && !isAssignee) {
        throw new ForbiddenException('Cannot update this task');
      }
      const prev = task.status;
      task.status = dto.status;
      if (dto.status === 'done' && prev !== 'done') {
        await this.activityService.log(task.albumId.toString(), 'task_completed', user.id, {
          taskId: task._id.toString(),
          title: task.title,
        });
      }
    }

    if (dto.approvalStatus !== undefined) {
      if (!isAdmin && !isAlbumOwner) {
        throw new ForbiddenException('Only admin or album owner can set approval');
      }
      if (!['none', 'pending', 'approved', 'rejected'].includes(dto.approvalStatus)) {
        throw new BadRequestException('Invalid approvalStatus');
      }
      task.approvalStatus = dto.approvalStatus;
      await this.activityService.log(task.albumId.toString(), 'approval_updated', user.id, {
        taskId: task._id.toString(),
        approvalStatus: dto.approvalStatus,
      });
    }

    await task.save();
    return {
      _id: task._id.toString(),
      status: task.status,
      approvalStatus: task.approvalStatus,
    };
  }
}
