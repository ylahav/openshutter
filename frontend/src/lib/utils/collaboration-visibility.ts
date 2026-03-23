import type { SiteConfig } from '$lib/types/site-config';

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

/** Mirrors backend `resolveCollaborationVisibility`. */
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

/** Album owner/admin always sees collaboration blocks for moderation. */
export function showCollabServiceForViewer(
	vis: ResolvedCollaborationVisibility,
	service: CollaborationService,
	isAuthenticated: boolean,
	isAlbumModerator: boolean,
): boolean {
	if (isAlbumModerator) return true;
	const s = vis[service];
	if (!s.enabled) return false;
	return isAuthenticated ? s.authenticated : s.public;
}

export function anyCollaborationSectionVisible(
	vis: ResolvedCollaborationVisibility,
	isAuthenticated: boolean,
	isAlbumModerator: boolean,
): boolean {
	return (
		showCollabServiceForViewer(vis, 'comments', isAuthenticated, isAlbumModerator) ||
		showCollabServiceForViewer(vis, 'tasks', isAuthenticated, isAlbumModerator) ||
		showCollabServiceForViewer(vis, 'activity', isAuthenticated, isAlbumModerator)
	);
}
