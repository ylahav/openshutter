import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { connectDB } from '../config/db';
import mongoose from 'mongoose';

export interface SiteContextGlobal {
  type: 'global';
}

export interface SiteContextOwnerSite {
  type: 'owner-site';
  ownerId: string;
}

export type SiteContext = SiteContextGlobal | SiteContextOwnerSite;

declare module 'express' {
  interface Request {
    siteContext?: SiteContext;
  }
}

@Injectable()
export class SiteContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SiteContextMiddleware.name);

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    // Default: global context
    (req as any).siteContext = { type: 'global' } satisfies SiteContextGlobal;

    const hostHeader = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string) || '';
    const hostname = hostHeader.split(',')[0]?.trim().toLowerCase() || '';

    if (!hostname) {
      return next();
    }

    try {
      await connectDB();
      const db = mongoose.connection.db;
      if (!db) {
        return next();
      }

      const ownerDomain = await db.collection('owner_domains').findOne({
        hostname,
        active: { $ne: false },
      });

      if (ownerDomain && ownerDomain.ownerId) {
        const ownerId =
          typeof ownerDomain.ownerId === 'string'
            ? ownerDomain.ownerId
            : ownerDomain.ownerId.toString?.() ?? '';

        if (ownerId) {
          (req as any).siteContext = {
            type: 'owner-site',
            ownerId,
          } satisfies SiteContextOwnerSite;
        }
      }
    } catch (error: any) {
      this.logger.warn(
        `Failed to resolve site context for host "${hostname}": ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // Fall back to global context on error
    }

    next();
  }
}

