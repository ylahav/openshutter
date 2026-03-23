import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Request } from 'express';
import { OptionalAdminGuard } from '../common/guards/optional-admin.guard';
import { AlbumAccessContext } from '../albums/albums.service';
import { CommentsService } from './comments.service';

@Controller('comments')
@UseGuards(OptionalAdminGuard)
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
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

  @Get('album/:albumId')
  async listAlbum(
    @Req() req: Request,
    @Param('albumId') albumId: string,
    @Query('includeHidden') includeHidden?: string,
    @Query('photoId') photoId?: string,
  ) {
    const accessContext = await this.getAccessContext(req);
    const user = (req as any).user;
    const include = includeHidden === 'true' || includeHidden === '1';
    return this.commentsService.listForAlbum(albumId, accessContext, {
      includeHidden: include,
      moderatorUserId: user?.id,
      isAdmin: user?.role === 'admin',
      photoId: photoId?.trim() || undefined,
      viewerUserId: user?.id,
    });
  }

  @Post('album/:albumId')
  async createAlbum(
    @Req() req: Request,
    @Param('albumId') albumId: string,
    @Body() body: { body?: string; parentCommentId?: string | null; photoId?: string | null },
  ) {
    const user = (req as any).user;
    if (!user?.id) {
      throw new UnauthorizedException('Sign in to post a comment');
    }
    const accessContext = await this.getAccessContext(req);
    return this.commentsService.createForAlbum(albumId, accessContext, user.id, {
      body: body?.body ?? '',
      parentCommentId: body?.parentCommentId,
      photoId: body?.photoId,
    });
  }

  @Post(':id/report')
  async report(@Req() req: Request, @Param('id') id: string) {
    const user = (req as any).user;
    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }
    const accessContext = await this.getAccessContext(req);
    return this.commentsService.reportComment(id, accessContext, user.id);
  }

  @Patch(':id')
  async patchHidden(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: { hidden?: boolean },
  ) {
    if (typeof body?.hidden !== 'boolean') {
      throw new BadRequestException('Body must include hidden: true or false');
    }
    const accessContext = await this.getAccessContext(req);
    const user = (req as any).user;
    return this.commentsService.setHidden(id, body.hidden, accessContext, user);
  }
}
