/**
 * Single source of truth for admin/owner authorization on the SvelteKit side.
 *
 * Two separate surfaces, both defined here so they can't drift apart:
 *
 *  1. `ownerCanAccessAdminPath` — which /admin *pages* an Editor may open.
 *     Used by hooks.server.ts and routes/admin/+layout.server.ts.
 *  2. `requireAdmin` / `requireAdminOrOwner` — the gate for /api/admin
 *     *endpoints*, mirroring the NestJS AdminGuard / AdminOrOwnerGuard on the
 *     controller each route proxies to.
 *
 * Rule for the API helpers: this proxy must never be *stricter* than the
 * backend guard, or the endpoint becomes unreachable for a role the backend
 * was written to serve. It may be equally strict, never looser — the backend
 * still enforces ownership on writes.
 */

import { json } from '@sveltejs/kit';

type User = App.Locals['user'];

export function isAdmin(user: User): boolean {
	return user?.role === 'admin';
}

export function isAdminOrOwner(user: User): boolean {
	return user?.role === 'admin' || user?.role === 'owner';
}

/**
 * Owner-only: deliberately excludes admins. For endpoints scoped to "this
 * Editor's own thing" (dedicated storage, owner analytics), where an admin has
 * no such thing and would resolve to an empty/undefined subject.
 */
export function isOwner(user: User): boolean {
	return user?.role === 'owner';
}

/**
 * Gate an endpoint that the backend protects with AdminGuard.
 * Returns a 401 Response to return as-is, or null when the caller may proceed.
 */
export function requireAdmin(locals: App.Locals): Response | null {
	if (!isAdmin(locals.user)) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}
	return null;
}

/**
 * Gate an endpoint that the backend protects with AdminOrOwnerGuard.
 * Returns a 401 Response to return as-is, or null when the caller may proceed.
 */
export function requireAdminOrOwner(locals: App.Locals): Response | null {
	if (!isAdminOrOwner(locals.user)) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}
	return null;
}

/**
 * /admin page paths an Editor (owner) may open. Everything content + templating;
 * system-level pages (users, groups, site-config, backup-restore, audit-logs,
 * marketplace, modules, translations, import-sync, docs) stay admin-only.
 *
 * Note this is deliberately broader than what some of the backing APIs allow —
 * an owner can open /admin/pages, but pages.controller.ts is AdminGuard, so the
 * data won't load. That mismatch is a product decision, not something the gate
 * should paper over.
 */
const OWNER_PAGE_PREFIXES = [
	'/admin/albums',
	'/admin/photos/upload',
	'/admin/videos',
	'/admin/storage',
	'/admin/tags',
	'/admin/people',
	'/admin/locations',
	'/admin/blog',
	'/admin/contact-submissions',
	'/admin/analytics',
	'/admin/pages',
	'/admin/templates',
	'/admin/theme-layout',
	'/admin/theme',
	'/admin/site-settings',
	'/admin/profile'
];

export function ownerCanAccessAdminPath(pathname: string): boolean {
	if (pathname === '/admin' || pathname === '/admin/') return true;
	if (/^\/admin\/photos\/[^/]+\/edit\/?$/.test(pathname)) return true;
	return OWNER_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
