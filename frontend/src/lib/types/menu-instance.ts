/**
 * Shared types for reusable menu instances stored on `site_config.template.menuInstances`.
 *
 * The same shape backs:
 * - the multi-menu editor on /admin/site-config (Menus tab)
 * - the Menu module's `instanceRef` picker
 * - the legacy menu instance editor in /admin/pages (kept temporarily)
 *
 * Render side: `frontend/src/lib/page-builder/primitives/menu/Menu.svelte` accepts `items` + style props.
 * `MenuModule.svelte` looks up `template.menuInstances[instanceRef]` and forwards the config.
 */

export type MenuItemType = 'link' | 'login' | 'logout';
export type MenuItemShowWhen = 'always' | 'loggedIn' | 'loggedOut';

export interface MenuEditorItem {
	label?: string;
	labelKey?: string;
	href: string;
	type?: MenuItemType;
	showWhen?: MenuItemShowWhen;
	external?: boolean;
	/** Restrict visibility to specific user roles (admin, owner, guest). Undefined/empty = visible to everyone. */
	roles?: string[];
}

export interface MenuInstanceConfig {
	orientation?: 'horizontal' | 'vertical';
	showAuthButtons?: boolean;
	items?: MenuEditorItem[];
	itemClass?: string;
	activeItemClass?: string;
	containerClass?: string;
	separator?: string | boolean;
	showActiveIndicator?: boolean;
}
