import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request } from 'express';
import { OptionalAdminGuard } from '../common/guards/optional-admin.guard';
import { AlbumAccessContext } from '../albums/albums.service';
import { CollaborationActivityService } from './collaboration-activity.service';
import { AlbumTasksService } from './album-tasks.service';

@Controller('collaboration')
@UseGuards(OptionalAdminGuard)
export class CollaborationController {
  constructor(
    private readonly activityService: CollaborationActivityService,
    private readonly tasksService: AlbumTasksService,
    @InjectModel('User') private userModel: Model<any>,
  ) {}

  private async getAccessContext(req: Request): Promise<AlbumAccessContext | null> {
    const user = (req as any).user;
    const siteContext = (req as any).siteContext;
    if (!user?.id) {
      if (siteContext?.type === 'owner-site') {
        return {
          userId: '',
          groupAliases: [],
          ownerSiteId: siteContext.ownerId as string,
        } as any;
      }
      return null;
    }
    const doc = await this.userModel.findById(user.id).select('groupAliases').lean().exec();
    if (!doc) return null;
    return {
      userId: user.id,
      groupAliases: Array.isArray(doc.groupAliases) ? doc.groupAliases : [],
      ownerSiteId: siteContext?.type === 'owner-site' ? (siteContext.ownerId as string) : undefined,
    } as any;
  }

  @Get('album/:albumId/activity')
  async activity(@Req() req: Request, @Param('albumId') albumId: string) {
    const accessContext = await this.getAccessContext(req);
    const user = (req as any).user;
    return this.activityService.listForAlbum(albumId, accessContext, 40, {
      viewerUserId: user?.id,
      isAdmin: user?.role === 'admin',
    });
  }

  @Get('album/:albumId/tasks')
  async listTasks(@Req() req: Request, @Param('albumId') albumId: string) {
    const accessContext = await this.getAccessContext(req);
    const user = (req as any).user;
    return this.tasksService.listForAlbum(albumId, accessContext, {
      viewerUserId: user?.id,
      isAdmin: user?.role === 'admin',
    });
  }

  @Post('album/:albumId/tasks')
  async createTask(
    @Req() req: Request,
    @Param('albumId') albumId: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      dueAt?: string;
      assignedToUserId?: string;
      approvalStatus?: string;
    },
  ) {
    const user = (req as any).user;
    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }
    const accessContext = await this.getAccessContext(req);
    return this.tasksService.create(albumId, accessContext, user.id, body);
  }

  @Patch('tasks/:taskId')
  async patchTask(
    @Req() req: Request,
    @Param('taskId') taskId: string,
    @Body() body: { status?: 'open' | 'done'; approvalStatus?: 'none' | 'pending' | 'approved' | 'rejected' },
  ) {
    const accessContext = await this.getAccessContext(req);
    const user = (req as any).user;
    return this.tasksService.update(taskId, accessContext, user, body);
  }
}
