import { describe, expect, it } from 'vitest';
import {
	isAdmin,
	isAdminOrOwner,
	isOwner,
	ownerCanAccessAdminPath,
	requireAdmin,
	requireAdminOrOwner
} from './admin-access';

/**
 * These predicates are the authorization gate for every /api/admin proxy route and
 * for /admin page access. The expectations below are the contract: a regression here
 * either locks Editors out of their own features or exposes system-level ones.
 */

const admin = { id: 'a', email: 'a@x.com', name: 'A', role: 'admin' as const };
const owner = { id: 'o', email: 'o@x.com', name: 'O', role: 'owner' as const };
const guest = { id: 'g', email: 'g@x.com', name: 'G', role: 'guest' as const };

describe('role predicates', () => {
	it('isAdmin accepts only admins', () => {
		expect(isAdmin(admin)).toBe(true);
		expect(isAdmin(owner)).toBe(false);
		expect(isAdmin(guest)).toBe(false);
		expect(isAdmin(null)).toBe(false);
	});

	it('isAdminOrOwner accepts admins and owners but not guests', () => {
		expect(isAdminOrOwner(admin)).toBe(true);
		expect(isAdminOrOwner(owner)).toBe(true);
		expect(isAdminOrOwner(guest)).toBe(false);
		expect(isAdminOrOwner(null)).toBe(false);
	});

	it('isOwner deliberately excludes admins', () => {
		expect(isOwner(owner)).toBe(true);
		expect(isOwner(admin)).toBe(false);
		expect(isOwner(null)).toBe(false);
	});
});

describe('require* gates', () => {
	const locals = (user: typeof admin | typeof owner | typeof guest | null) =>
		({ user, siteContext: { type: 'global' } }) as App.Locals;

	it('requireAdmin lets admins through and 401s everyone else', async () => {
		expect(requireAdmin(locals(admin))).toBeNull();
		for (const u of [owner, guest, null]) {
			const res = requireAdmin(locals(u));
			expect(res).toBeInstanceOf(Response);
			expect(res!.status).toBe(401);
			await expect(res!.json()).resolves.toEqual({ success: false, error: 'Unauthorized' });
		}
	});

	it('requireAdminOrOwner lets admins and owners through, 401s guests and anonymous', () => {
		expect(requireAdminOrOwner(locals(admin))).toBeNull();
		expect(requireAdminOrOwner(locals(owner))).toBeNull();
		expect(requireAdminOrOwner(locals(guest))!.status).toBe(401);
		expect(requireAdminOrOwner(locals(null))!.status).toBe(401);
	});
});

describe('ownerCanAccessAdminPath', () => {
	it('allows the admin dashboard root', () => {
		expect(ownerCanAccessAdminPath('/admin')).toBe(true);
		expect(ownerCanAccessAdminPath('/admin/')).toBe(true);
	});

	it.each([
		'/admin/albums',
		'/admin/albums/123/edit',
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
		'/admin/theme',
		'/admin/theme-layout',
		'/admin/site-settings',
		'/admin/profile'
	])('allows content/templating path %s', (p) => {
		expect(ownerCanAccessAdminPath(p)).toBe(true);
	});

	it.each([
		'/admin/users',
		'/admin/groups',
		'/admin/site-config',
		'/admin/backup-restore',
		'/admin/audit-logs',
		'/admin/marketplace',
		'/admin/modules',
		'/admin/translations',
		'/admin/import-sync',
		'/admin/docs'
	])('denies system-level path %s', (p) => {
		expect(ownerCanAccessAdminPath(p)).toBe(false);
	});

	it('allows a single photo edit page but not the photos root', () => {
		expect(ownerCanAccessAdminPath('/admin/photos/abc123/edit')).toBe(true);
		expect(ownerCanAccessAdminPath('/admin/photos/abc123/edit/')).toBe(true);
		expect(ownerCanAccessAdminPath('/admin/photos')).toBe(false);
		expect(ownerCanAccessAdminPath('/admin/photos/abc123')).toBe(false);
	});

	it('does not let a lookalike prefix through', () => {
		expect(ownerCanAccessAdminPath('/admin/site-config-backup')).toBe(false);
		expect(ownerCanAccessAdminPath('/adminx/albums')).toBe(false);
	});

	/**
	 * The predicate matches on prefixes, so a new page whose path happens to extend an
	 * allowed prefix (e.g. anything under /admin/storage) is granted to Editors silently.
	 * This pins every admin page route that exists today. Adding a route means adding it
	 * here deliberately, on one side or the other.
	 */
	describe('every real /admin page route is classified deliberately', () => {
		const ALLOWED = [
			'/admin',
			'/admin/albums',
			'/admin/albums/X',
			'/admin/albums/X/edit',
			'/admin/albums/new',
			'/admin/analytics',
			'/admin/blog-articles',
			'/admin/blog-articles/X/edit',
			'/admin/blog-articles/new',
			'/admin/blog-categories',
			'/admin/blog-categories/X/edit',
			'/admin/blog-categories/new',
			'/admin/blogs',
			'/admin/contact-submissions',
			'/admin/locations',
			'/admin/pages',
			'/admin/people',
			'/admin/photos/X/edit',
			'/admin/photos/upload',
			'/admin/profile',
			'/admin/site-settings',
			'/admin/storage',
			'/admin/storage/google-drive-setup',
			'/admin/tags',
			'/admin/templates',
			'/admin/templates/customize',
			'/admin/templates/header-footer',
			'/admin/templates/overrides',
			'/admin/theme',
			'/admin/theme-layout',
			'/admin/videos/X/edit'
		];
		const DENIED = [
			'/admin/audit-logs',
			'/admin/backup-restore',
			'/admin/docs/ui',
			'/admin/groups',
			'/admin/import-sync',
			'/admin/marketplace',
			'/admin/modules',
			'/admin/site-config',
			'/admin/translations',
			'/admin/users'
		];

		it.each(ALLOWED)('allows %s', (p) => expect(ownerCanAccessAdminPath(p)).toBe(true));
		it.each(DENIED)('denies %s', (p) => expect(ownerCanAccessAdminPath(p)).toBe(false));
	});
});
