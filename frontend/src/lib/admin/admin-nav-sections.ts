/**
 * Admin sidebar — grouped like the admin shell mockup (Content / Site / System / Tools).
 * Match: `href` prefix rules; `/admin` is exact-only for the dashboard item.
 */
export type AdminNavGlyph =
	| 'home'
	| 'album'
	| 'tag'
	| 'people'
	| 'location'
	| 'group'
	| 'template'
	| 'layout'
	| 'page'
	| 'config'
	| 'translate'
	| 'storage'
	| 'user'
	| 'contact'
	| 'blog'
	| 'backup'
	| 'import'
	| 'market'
	| 'chart'
	| 'shield';

export type AdminNavItem = {
	href: string;
	labelKey: string;
	icon: AdminNavGlyph;
	/** If true, sidebar may show `pagination.total` as a badge (contact list). */
	badgeFromContactTotal?: boolean;
};

export type AdminNavGroup = {
	titleKey: string;
	items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
	{
		titleKey: 'admin.sidebarGroupContent',
		items: [
			{ href: '/admin', labelKey: 'admin.sidebarDashboard', icon: 'home' },
			{ href: '/admin/albums', labelKey: 'admin.sidebarNavAlbums', icon: 'album' },
			{ href: '/admin/tags', labelKey: 'admin.sidebarNavTags', icon: 'tag' },
			{ href: '/admin/people', labelKey: 'admin.sidebarNavPeople', icon: 'people' },
			{ href: '/admin/locations', labelKey: 'admin.sidebarNavLocations', icon: 'location' },
			{ href: '/admin/blogs', labelKey: 'admin.sidebarNavBlog', icon: 'blog' },
		],
	},
	{
		titleKey: 'admin.sidebarGroupSite',
		items: [
			{ href: '/admin/site-config', labelKey: 'admin.sidebarNavSite', icon: 'config' },
			{ href: '/admin/templates', labelKey: 'admin.sidebarNavTemplates', icon: 'template' },
			{ href: '/admin/theme-layout', labelKey: 'admin.sidebarNavTemplateLayout', icon: 'layout' },
			{ href: '/admin/pages', labelKey: 'admin.sidebarNavPages', icon: 'page' },
			{ href: '/admin/translations', labelKey: 'admin.sidebarNavTranslations', icon: 'translate' },
		],
	},
	{
		titleKey: 'admin.sidebarGroupSystem',
		items: [
			{ href: '/admin/storage', labelKey: 'admin.sidebarNavStorage', icon: 'storage' },
			{ href: '/admin/users', labelKey: 'admin.sidebarNavUsers', icon: 'user' },
			{ href: '/admin/groups', labelKey: 'admin.sidebarNavGroups', icon: 'group' },
			{
				href: '/admin/contact-submissions',
				labelKey: 'admin.sidebarNavContact',
				icon: 'contact',
				badgeFromContactTotal: true,
			},
		],
	},
	{
		titleKey: 'admin.sidebarGroupTools',
		items: [
			{ href: '/admin/backup-restore', labelKey: 'admin.sidebarNavBackup', icon: 'backup' },
			{ href: '/admin/import-sync', labelKey: 'admin.sidebarNavMigration', icon: 'import' },
			{ href: '/admin/marketplace', labelKey: 'admin.sidebarNavMarketplace', icon: 'market' },
			{ href: '/admin/analytics', labelKey: 'admin.sidebarNavAnalytics', icon: 'chart' },
			{ href: '/admin/audit-logs', labelKey: 'admin.sidebarNavAuditLogs', icon: 'shield' },
		],
	},
];
