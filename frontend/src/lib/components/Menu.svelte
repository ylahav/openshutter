<!--
	Menu Component - A configurable navigation menu component
	
	Usage examples:
	
	1. With site config:
		<Menu config={headerConfig} />
	
	2. With direct items:
		<Menu items={[
			{ labelKey: 'navigation.home', href: '/' },
			{ label: 'About', href: '/about' },
			{ href: '/contact', external: true }
		]} />
	
	3. Custom styling:
		<Menu 
			items={menuItems}
			itemClass="text-blue-600 hover:text-blue-800"
			activeItemClass="font-bold underline"
			orientation="vertical"
		/>
-->
<script lang="ts">
	import { t } from '$stores/i18n';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth';
	import { siteConfigLoading } from '$stores/siteConfig';
	import type { SiteConfig } from '$types/site-config';

	export interface MenuItem {
		labelKey?: string; // Translation key (e.g., 'navigation.home')
		label?: string; // Direct label text (fallback if labelKey is not provided)
		href: string; // Link URL
		external?: boolean; // Whether link opens in new tab
		icon?: string; // Optional icon name/class
		roles?: string[]; // Optional: show only for specific user roles
		condition?: () => boolean; // Optional: custom condition function
	}

	export interface MenuConfig {
		menu?: MenuItem[];
		showMenu?: boolean;
		[key: string]: any;
	}

	export interface MenuProps {
		items?: MenuItem[]; // Menu items passed directly
		config?: MenuConfig; // Site config headerConfig (will use menu from config)
		itemClass?: string; // CSS class for menu items
		activeItemClass?: string; // CSS class for active menu item
		containerClass?: string; // CSS class for menu container
		separator?: string | boolean; // Separator between items (string or boolean)
		orientation?: 'horizontal' | 'vertical'; // Menu orientation
		showActiveIndicator?: boolean; // Highlight active page
		showAuthButtons?: boolean; // Whether to show auth-related menu items
	}

	// Props with defaults
	let {
		items = [],
		config,
		itemClass = 'hover:text-gray-900',
		activeItemClass = 'text-primary-600 font-medium',
		containerClass = 'flex items-center gap-4',
		separator = false,
		orientation = 'horizontal',
		showActiveIndicator = true,
		showAuthButtons = false,
	}: MenuProps = $props();

	// Get menu items from props or config, with defaults and auth buttons
	const menuItems = $derived.by(() => {
		let result: MenuItem[] = [];
		
		// Priority: items prop > config.menu > defaults
		if (items !== undefined && items !== null && items.length > 0) {
			result = [...items];
		} else if (config?.menu !== undefined) {
			// Check if menu exists in config (even if empty array)
			if (Array.isArray(config.menu)) {
				if (config.menu.length > 0) {
					// Use configured menu items
					result = [...config.menu];
				}
				// If config.menu is empty array [], result stays empty and we'll use defaults below
			}
		}
		
		// Use defaults if no items were set (either no config or empty array)
		if (result.length === 0) {
			result = [
				{ labelKey: 'navigation.home', href: '/' },
				{ labelKey: 'navigation.albums', href: '/albums' },
				{ label: 'About', href: '/about' },
				{ labelKey: 'navigation.search', href: '/search' }
			];
		}

		// Add auth-related items if enabled, but only if they don't already exist in the menu
		if (showAuthButtons) {
			// Check if auth links already exist in the menu
			const hasAdminLink = result.some(item => item.href === '/admin');
			const hasOwnerLink = result.some(item => item.href === '/owner');
			const hasLoginLink = result.some(item => item.href === '/login');
			
			if ($auth.authenticated && $auth.user) {
				if ($auth.user.role === 'admin' && !hasAdminLink) {
					result.push({ labelKey: 'navigation.admin', href: '/admin' });
				} else if ($auth.user.role === 'owner' && !hasOwnerLink) {
					result.push({ labelKey: 'header.myGallery', href: '/owner' });
				}
			} else {
				if (!hasLoginLink) {
					result.push({ labelKey: 'auth.signIn', href: '/login' });
				}
			}
		}
		
		
		return result;
	});

	// Get display text for a menu item
	function getItemLabel(item: MenuItem): string {
		if (item.labelKey) {
			return $t(item.labelKey, item.label || item.href);
		}
		return item.label || item.href;
	}

	// Check if item is active (current page)
	function isActive(item: MenuItem): boolean {
		if (!showActiveIndicator) return false;
		const currentPath = $page.url.pathname;
		// Exact match or starts with (for nested routes)
		return currentPath === item.href || currentPath.startsWith(item.href + '/');
	}

	// Get item classes
	function getItemClasses(item: MenuItem): string {
		const baseClasses = itemClass;
		const activeClasses = isActive(item) ? activeItemClass : '';
		return `${baseClasses} ${activeClasses}`.trim();
	}

	// Get container classes based on orientation
	const finalContainerClass = $derived(orientation === 'vertical' 
		? containerClass.replace('flex items-center', 'flex flex-col items-start')
		: containerClass);

	// Filter items based on conditions and roles
	const visibleItems = $derived(menuItems.filter(item => {
		// Check custom condition function first
		if (item.condition !== undefined) {
			return item.condition();
		}
		
		// Check role-based visibility
		if (item.roles && item.roles.length > 0) {
			const userRole = $auth.user?.role;
			if (!userRole) {
				// User not authenticated, hide role-restricted items
				return false;
			}
			// Show item if user's role is in the allowed roles list
			return item.roles.includes(userRole);
		}
		
		// No restrictions, show item
		return true;
	}));
</script>

	{#if !$siteConfigLoading && visibleItems.length > 0}
	<nav class={finalContainerClass}>
		{#each visibleItems as item, index}
			<a
				href={item.href}
				class={getItemClasses(item)}
				target={item.external ? '_blank' : undefined}
				rel={item.external ? 'noopener noreferrer' : undefined}
			>
				{#if item.icon}
					<span class="icon-{item.icon}" aria-hidden="true"></span>
				{/if}
				{getItemLabel(item)}
			</a>
			{#if separator && index < visibleItems.length - 1}
				{#if typeof separator === 'string'}
					<span class="text-gray-400">{separator}</span>
				{:else}
					<span class="text-gray-400">|</span>
				{/if}
			{/if}
		{/each}
	</nav>
{/if}
