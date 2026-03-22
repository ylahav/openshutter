import type { Request } from 'express';

/**
 * Owner user id when the request Host maps to an owner custom domain (SiteContextMiddleware).
 */
export function ownerSiteUserIdFromRequest(req: Request): string | undefined {
  const siteContext = (req as any).siteContext as { type?: string; ownerId?: string } | undefined;
  if (siteContext?.type === 'owner-site' && siteContext.ownerId) {
    return siteContext.ownerId;
  }
  return undefined;
}
