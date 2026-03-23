import { ForbiddenException } from '@nestjs/common';
import { siteConfigService } from '../services/site-config';
import type { SiteConfig } from '../types/site-config';

export type CollaborationService = 'comments' | 'tasks' | 'activity';

export type CollaborationServiceVisibility = {
  enabled: boolean;
  public: boolean;
  authenticated: boolean;
};

export type ResolvedCollaborationVisibility = {
  comments: CollaborationServiceVisibility;
  tasks: CollaborationServiceVisibility;
  activity: CollaborationServiceVisibility;
};

/**
 * Resolves per-service collaboration: master `enabled` plus audience flags.
 * - Per service: `enabled: false` turns the service off for everyone except album moderators (handled in UI/API layer).
 * - When enabled, `public` / `authenticated` control visitors vs signed-in visibility (default on if unset).
 * - If `features.collaboration` has any service key set, granular mode applies; omitted services default to all on.
 * - Else if `features.enableComments === false` (legacy) with no granular object, everything is off.
 * - Else all on (backward compatible).
 */
export function resolveCollaborationVisibility(
  features: SiteConfig['features'] | undefined | null,
): ResolvedCollaborationVisibility {
  const c = features?.collaboration;
  const hasGranular =
    c != null &&
    typeof c === 'object' &&
    (c.comments != null || c.tasks != null || c.activity != null);
  const legacyMasterOff = features?.enableComments === false && !hasGranular;

  const svc = (service: CollaborationService): CollaborationServiceVisibility => {
    if (legacyMasterOff) return { enabled: false, public: false, authenticated: false };
    const s = c?.[service];
    const enabled = s?.enabled !== false;
    if (!enabled) return { enabled: false, public: false, authenticated: false };
    return {
      enabled: true,
      public: s?.public !== false,
      authenticated: s?.authenticated !== false,
    };
  };

  return {
    comments: svc('comments'),
    tasks: svc('tasks'),
    activity: svc('activity'),
  };
}

export function canViewCollaborationService(
  vis: ResolvedCollaborationVisibility,
  service: CollaborationService,
  isAuthenticated: boolean,
): boolean {
  const s = vis[service];
  if (!s.enabled) return false;
  return isAuthenticated ? s.authenticated : s.public;
}

export async function assertCommentsWritable(): Promise<void> {
  const cfg = await siteConfigService.getConfig();
  const vis = resolveCollaborationVisibility(cfg.features);
  if (!vis.comments.enabled || !vis.comments.authenticated) {
    throw new ForbiddenException('Posting comments is disabled on this site.');
  }
}

export async function assertTasksWritable(): Promise<void> {
  const cfg = await siteConfigService.getConfig();
  const vis = resolveCollaborationVisibility(cfg.features);
  if (!vis.tasks.enabled || !vis.tasks.authenticated) {
    throw new ForbiddenException('Tasks are disabled on this site.');
  }
}
