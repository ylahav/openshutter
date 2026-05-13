import { Controller, Get, Query, UseGuards, Logger, InternalServerErrorException } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { connectDB } from '../config/db';
import {
  AuditLogQuery,
  AuditAction,
  countAuditLogs,
  findAuditLogs,
} from '../services/audit-log';
import { UserModel } from '../models/User';
import mongoose from 'mongoose';

/** UI / query-string aliases → persisted `action` values */
const ACTION_ALIASES: Record<string, AuditAction> = {
  created: 'create',
  updated: 'update',
  deleted: 'delete',
  logged_in: 'login',
  logged_out: 'logout',
  create: 'create',
  update: 'update',
  delete: 'delete',
  login: 'login',
  logout: 'logout',
  upload: 'upload',
  download: 'download',
};

function parseActionFilter(raw?: string): AuditAction[] | undefined {
  if (!raw || !raw.trim()) return undefined;
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const mapped = parts
    .map((p) => ACTION_ALIASES[p] || (p as AuditAction))
    .filter(Boolean) as AuditAction[];
  if (mapped.length === 0) return undefined;
  return [...new Set(mapped)];
}

function pickDisplayName(user: { name?: Record<string, string>; username?: string } | null): string {
  if (!user) return '';
  const name = user.name;
  if (name && typeof name === 'object') {
    const first =
      name.en ||
      name.he ||
      (Object.keys(name).length ? name[Object.keys(name)[0] as string] : undefined);
    if (first && String(first).trim()) return String(first).trim();
  }
  return user.username || '';
}

function pastVerbForAction(action: string): string {
  switch (action) {
    case 'create':
      return 'created';
    case 'update':
      return 'updated';
    case 'delete':
      return 'deleted';
    case 'login':
      return 'logged in';
    case 'logout':
      return 'logged out';
    case 'upload':
      return 'uploaded';
    case 'download':
      return 'downloaded';
    default:
      return action;
  }
}

function buildSummary(
  row: {
    action: string;
    resourceType?: string;
    resourceAlias?: string;
    resourceId?: string;
  },
  displayUser: string,
): string {
  const who = displayUser || 'Unknown user';
  const action = row.action;
  if (action === 'login') return `${who} logged in`;
  if (action === 'logout') return `${who} logged out`;

  const rt = (row.resourceType || 'resource').trim() || 'resource';
  const label = (row.resourceAlias || row.resourceId || '').trim();
  const verb = pastVerbForAction(action);
  if (label) {
    return `${who} ${verb} ${rt} "${label}"`;
  }
  return `${who} ${verb} ${rt}`;
}

@Controller('admin/audit-logs')
@UseGuards(AdminGuard)
export class AuditLogsController {
  private readonly logger = new Logger(AuditLogsController.name);

  /**
   * Path: GET /api/admin/audit-logs
   * Query: page, limit, userId, action (comma-separated), since, until (ISO dates)
   */
  @Get()
  async list(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('userId') userId?: string,
    @Query('action') actionRaw?: string,
    @Query('since') sinceRaw?: string,
    @Query('until') untilRaw?: string,
  ) {
    try {
      await connectDB();
      if (!mongoose.connection.db) {
        throw new InternalServerErrorException('Database connection not established');
      }

      const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(limitStr || '25', 10) || 25));
      const skip = (page - 1) * limit;

      const actions = parseActionFilter(actionRaw);
      const q: AuditLogQuery = {};
      if (userId && mongoose.Types.ObjectId.isValid(userId)) q.userId = userId;
      if (actions && actions.length > 0) {
        q.action = actions.length === 1 ? actions[0]! : actions;
      }

      if (sinceRaw) {
        const d = new Date(sinceRaw);
        if (!Number.isNaN(d.getTime())) q.since = d;
      }
      if (untilRaw) {
        const d = new Date(untilRaw);
        if (!Number.isNaN(d.getTime())) q.until = d;
      }

      const [rows, total] = await Promise.all([
        findAuditLogs(q, limit, skip),
        countAuditLogs(q),
      ]);

      const userIds = [
        ...new Set(
          rows.map((r) => r.userId).filter((id): id is string => !!id && mongoose.Types.ObjectId.isValid(id)),
        ),
      ];
      let userMap = new Map<string, { name?: Record<string, string>; username?: string }>();
      if (userIds.length > 0) {
        const users = await UserModel.find({ _id: { $in: userIds } })
          .select('name username')
          .lean();
        userMap = new Map(
          users.map((u) => [
            String(u._id),
            { name: u.name as Record<string, string> | undefined, username: u.username },
          ]),
        );
      }

      const data = rows.map((doc) => {
        const idStr = doc._id != null ? String(doc._id) : '';
        const uid = doc.userId && mongoose.Types.ObjectId.isValid(doc.userId) ? doc.userId : undefined;
        const u = uid ? userMap.get(uid) : undefined;
        const displayUser = pickDisplayName(u || null);
        const resourceAlias =
          doc.resourceAlias ||
          (doc.details && typeof doc.details === 'object' && doc.details !== null && 'resourceAlias' in doc.details
            ? String((doc.details as { resourceAlias?: string }).resourceAlias || '')
            : '') ||
          undefined;

        const summary = buildSummary(
          {
            action: doc.action,
            resourceType: doc.resourceType,
            resourceAlias,
            resourceId: doc.resourceId,
          },
          displayUser,
        );

        return {
          _id: idStr,
          timestamp: doc.timestamp ? new Date(doc.timestamp).toISOString() : new Date().toISOString(),
          action: doc.action,
          userId: doc.userId || undefined,
          userRole: doc.userRole || undefined,
          userDisplayName: displayUser || undefined,
          ip: doc.ipAddress || undefined,
          userAgent: doc.userAgent || undefined,
          resourceType: doc.resourceType || '',
          resourceId: doc.resourceId || undefined,
          resourceAlias: resourceAlias || undefined,
          details: doc.details as Record<string, unknown> | undefined,
          summary,
        };
      });

      const totalPages = Math.max(1, Math.ceil(total / limit));

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('Error listing audit logs:', error);
      throw new InternalServerErrorException('Failed to load audit logs');
    }
  }
}
