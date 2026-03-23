import { Body, Controller, Get, Param, Post, Req, UnauthorizedException, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommentsService } from '../../../comments/comments.service';
import { AlbumAccessContext } from '../../../albums/albums.service';
import { ApiKeyGuard } from '../../../api-keys/guards/api-key.guard';
import { ApiScopeGuard } from '../../../api-keys/guards/api-scope.guard';
import { ApiScope } from '../../../api-keys/decorators/api-scope.decorator';
import { RateLimitInterceptor } from '../../../api-keys/interceptors/rate-limit.interceptor';

@ApiTags('comments')
@ApiSecurity('apiKey')
@Controller('v1/comments')
@UseGuards(ApiKeyGuard, ApiScopeGuard)
@UseInterceptors(RateLimitInterceptor)
export class V1CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
    @InjectModel('User') private userModel: Model<any>,
  ) {}

  private async getAccessContext(req: Request): Promise<AlbumAccessContext | null> {
    const apiKey = (req as any).apiKey;
    const siteContext = (req as any).siteContext;

    if (!apiKey?.userId) {
      if (siteContext?.type === 'owner-site') {
        return {
          userId: '',
          groupAliases: [],
          ownerSiteId: siteContext.ownerId as string,
        } as any;
      }
      return null;
    }

    const doc = await this.userModel
      .findById(apiKey.userId)
      .select('groupAliases')
      .lean()
      .exec();

    if (!doc) {
      return null;
    }

    return {
      userId: apiKey.userId.toString(),
      groupAliases: Array.isArray(doc.groupAliases) ? doc.groupAliases : [],
      ownerSiteId: siteContext?.type === 'owner-site' ? (siteContext.ownerId as string) : undefined,
    } as any;
  }

  @Get('album/:albumId')
  @ApiOperation({ summary: 'List comments for an album (same visibility as album for the API key user)' })
  @ApiParam({ name: 'albumId', description: 'Album id or alias' })
  @ApiScope('comments:read', 'read')
  async list(@Req() req: Request, @Param('albumId') albumId: string) {
    const accessContext = await this.getAccessContext(req);
    return this.commentsService.listForAlbum(albumId, accessContext, {
      includeHidden: false,
      photoId: undefined,
      viewerUserId: accessContext?.userId,
      isAdmin: false,
    });
  }

  @Post('album/:albumId')
  @ApiOperation({ summary: 'Post a comment (requires comments:write or write scope)' })
  @ApiParam({ name: 'albumId', description: 'Album id or alias' })
  @ApiScope('comments:write', 'write')
  async create(
    @Req() req: Request,
    @Param('albumId') albumId: string,
    @Body() body: { body?: string; parentCommentId?: string | null; photoId?: string | null },
  ) {
    const apiKey = (req as any).apiKey;
    if (!apiKey?.userId) {
      throw new UnauthorizedException('API key must be associated with a user to post comments');
    }
    const accessContext = await this.getAccessContext(req);
    return this.commentsService.createForAlbum(albumId, accessContext, apiKey.userId.toString(), {
      body: body?.body ?? '',
      parentCommentId: body?.parentCommentId,
      photoId: body?.photoId,
    });
  }
}
