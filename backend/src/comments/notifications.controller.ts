import { Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { OptionalAdminGuard } from '../common/guards/optional-admin.guard';
import { AuthRequiredGuard } from '../common/guards/auth-required.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(OptionalAdminGuard, AuthRequiredGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(@Req() req: Request, @Query('limit') limitStr?: string) {
    const user = (req as any).user;
    const limit = limitStr ? Number.parseInt(limitStr, 10) : 50;
    const rows = await this.notificationsService.listForUser(user.id, limit);
    return {
      data: rows.map((n: any) => ({
        _id: n._id.toString(),
        kind: n.kind,
        title: n.title,
        body: n.body,
        linkPath: n.linkPath,
        read: n.read,
        createdAt: n.createdAt,
      })),
    };
  }

  @Patch('read-all')
  async markAll(@Req() req: Request) {
    const user = (req as any).user;
    await this.notificationsService.markAllRead(user.id);
    return { ok: true };
  }

  @Patch(':id/read')
  async markRead(@Req() req: Request, @Param('id') id: string) {
    const user = (req as any).user;
    await this.notificationsService.markRead(user.id, id);
    return { ok: true };
  }
}
