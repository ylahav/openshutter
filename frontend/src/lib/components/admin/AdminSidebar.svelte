<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { ADMIN_NAV_GROUPS } from '$lib/admin/admin-nav-sections';
	import type { AdminNavItem } from '$lib/admin/admin-nav-sections';
	import AdminNavIcon from '$lib/components/admin/AdminNavIcon.svelte';
	import { logout } from '$lib/stores/auth';
	import { t } from '$stores/i18n';

	const STORAGE_KEY = 'openshutter-admin-sidebar-collapsed';

	let { heading = '', mobileOpen = $bindable(false) }: { heading?: string; mobileOpen?: boolean } =
		$props();

	let collapsed = $state(false);
	let contactTotal = $state<number | null>(null);

	onMount(() => {
		if (!browser) return;
		collapsed = localStorage.getItem(STORAGE_KEY) === '1';

		void (async () => {
			try {
				const res = await fetch('/api/contact-submissions?page=1&limit=1');
				const json = await res.json().catch(() => ({}));
				if (res.ok && json?.success) {
					contactTotal = Number(json?.pagination?.total ?? 0);
				}
			} catch {
				contactTotal = null;
			}
		})();
	});

	function toggleCollapsed() {
		collapsed = !collapsed;
		if (browser) localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
	}

	function closeMobile() {
		mobileOpen = false;
	}

	async function handleLogout() {
		closeMobile();
		await logout();
	}

	function navItemActive(pathname: string, href: string): boolean {
		if (href === '/admin') return pathname === '/admin';
		if (href === '/admin/theme-layout') {
			return (
				pathname === '/admin/theme-layout' ||
				pathname === '/admin/template-config' ||
				pathname === '/admin/layout'
			);
		}
		return pathname === href || pathname.startsWith(href + '/');
	}

	function linkSurface(active: boolean): string {
		const base =
			'flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors border min-h-[2.5rem]';
		const pad = 'px-2.5 py-2';
		if (active) {
			return `${base} ${pad} bg-white dark:bg-surface-900 text-(--color-primary-700) dark:text-(--color-primary-300) border-[color-mix(in_oklab,var(--color-surface-950)_10%,transparent)] shadow-sm`;
		}
		return `${base} ${pad} border-transparent text-(--color-surface-700-300) hover:bg-[color-mix(in_oklab,var(--color-surface-950)_5%,transparent)] dark:hover:bg-[color-mix(in_oklab,var(--color-surface-50)_6%,transparent)]`;
	}

	function linkCollapsed(active: boolean): string {
		const base =
			'flex items-center justify-center rounded-lg text-sm font-medium transition-colors border min-h-[2.5rem] lg:px-1 lg:py-2 px-2.5 py-2';
		if (active) {
			return `${base} bg-white dark:bg-surface-900 text-(--color-primary-700) dark:text-(--color-primary-300) border-[color-mix(in_oklab,var(--color-surface-950)_10%,transparent)] shadow-sm`;
		}
		return `${base} border-transparent text-(--color-surface-700-300) hover:bg-[color-mix(in_oklab,var(--color-surface-950)_5%,transparent)] dark:hover:bg-[color-mix(in_oklab,var(--color-surface-50)_6%,transparent)]`;
	}

	function badgeForItem(item: AdminNavItem): number | null {
		if (!item.badgeFromContactTotal || contactTotal == null || contactTotal < 1) return null;
		return contactTotal;
	}

	const pathname = $derived($page.url.pathname);
	const useCollapsed = $derived(collapsed);
	const headingParts = $derived.by(() => {
		const h = typeof heading === 'string' ? heading : '';
		const m = h.match(/^(.+?)\s+for\s+(.+)$/i);
		if (m) return { brand: m[1].trim(), site: m[2].trim() };
		return { brand: h || 'Admin', site: '' as string };
	});
</script>

{#if mobileOpen}
	<button
		type="button"
		class="fixed inset-0 z-120 bg-surface-950/50 backdrop-blur-[1px] lg:hidden"
		aria-label={$t('admin.sidebarCloseMenu')}
		onclick={closeMobile}
	></button>
{/if}

<aside
	class="fixed inset-y-0 inset-s-0 z-130 flex flex-col border-e border-[color-mix(in_oklab,var(--color-surface-950)_10%,transparent)] dark:border-[color-mix(in_oklab,var(--color-surface-50)_12%,transparent)] bg-[color-mix(in_oklab,var(--color-surface-100-900)_40%,var(--color-surface-50-950))] shadow-lg transition-[width,transform] duration-200 ease-out lg:static lg:z-0 lg:translate-x-0 lg:shadow-none lg:shrink-0 lg:rounded-xl lg:border {useCollapsed
		? 'w-56 sm:w-60 lg:w-14'
		: 'w-56 sm:w-60 lg:w-60'} {mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}"
	aria-label={$t('admin.sidebarNavAria')}
>
	<div
		class="flex items-center gap-1 border-b border-[color-mix(in_oklab,var(--color-surface-950)_8%,transparent)] dark:border-[color-mix(in_oklab,var(--color-surface-50)_10%,transparent)] p-2 shrink-0"
	>
		<button
			type="button"
			class="btn btn-sm preset-tonal shrink-0 p-2 hidden lg:inline-flex"
			onclick={toggleCollapsed}
			title={useCollapsed ? $t('admin.sidebarExpand') : $t('admin.sidebarCollapse')}
			aria-expanded={!useCollapsed}
			aria-controls="admin-sidebar-nav"
		>
			<svg class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				{#if useCollapsed}
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
				{:else}
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
				{/if}
			</svg>
		</button>
		<button
			type="button"
			class="btn btn-sm preset-tonal ms-auto px-2 lg:hidden"
			onclick={closeMobile}
			aria-label={$t('admin.sidebarCloseMenu')}
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<div
		class="px-3 py-3 border-b border-[color-mix(in_oklab,var(--color-surface-950)_6%,transparent)] dark:border-[color-mix(in_oklab,var(--color-surface-50)_8%,transparent)] shrink-0 {useCollapsed
			? 'lg:hidden'
			: ''}"
	>
		<p class="text-base sm:text-lg font-bold tracking-tight text-(--color-surface-900-100)">
			{headingParts.brand}
		</p>
		{#if headingParts.site}
			<p class="text-sm font-semibold text-(--heading-font-color) leading-snug mt-0.5 line-clamp-2">
				{headingParts.site}
			</p>
		{/if}
	</div>

	<nav id="admin-sidebar-nav" class="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-5 min-h-0">
		{#each ADMIN_NAV_GROUPS as group}
			<div class="space-y-1">
				<div class="px-1 pt-0.5 pb-1 {useCollapsed ? 'lg:hidden' : ''}">
					<div class="flex items-center gap-2 py-1.5">
						<div
							class="h-px flex-1 min-w-0 bg-[color-mix(in_oklab,var(--color-surface-950)_12%,transparent)] dark:bg-[color-mix(in_oklab,var(--color-surface-50)_14%,transparent)]"
						></div>
						<span
							class="shrink-0 text-sm font-semibold uppercase tracking-[0.18em] text-(--color-surface-500-500)"
						>
							{$t(group.titleKey)}
						</span>
						<div
							class="h-px flex-1 min-w-0 bg-[color-mix(in_oklab,var(--color-surface-950)_12%,transparent)] dark:bg-[color-mix(in_oklab,var(--color-surface-50)_14%,transparent)]"
						></div>
					</div>
				</div>
				<ul class="m-0 list-none space-y-0.5 p-0">
					{#each group.items as item}
						{@const active = navItemActive(pathname, item.href)}
						{@const label = $t(item.labelKey)}
						{@const badge = badgeForItem(item)}
						<li>
							<a
								href={item.href}
								class={useCollapsed ? linkCollapsed(active) : linkSurface(active)}
								title={useCollapsed ? label : undefined}
								aria-current={active ? 'page' : undefined}
								data-sveltekit-reload
								onclick={closeMobile}
							>
								<AdminNavIcon
									name={item.icon}
									className="h-4.5 w-4.5 shrink-0 {active
										? 'text-(--color-primary-600)'
										: 'text-(--color-surface-600-400)'}"
								/>
								<span class="flex-1 truncate {useCollapsed ? 'lg:sr-only' : ''}">{label}</span>
								{#if badge != null}
									<span
										class="ms-auto inline-flex min-w-5 justify-center rounded-full bg-(--color-primary-500) px-1.5 py-0.5 text-[10px] font-bold leading-none text-white {useCollapsed
											? 'lg:sr-only'
											: ''}"
									>
										{badge > 99 ? '99+' : badge}
									</span>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</nav>

	<div
		class="shrink-0 border-t border-[color-mix(in_oklab,var(--color-surface-950)_8%,transparent)] dark:border-[color-mix(in_oklab,var(--color-surface-50)_10%,transparent)] px-2 pt-2 pb-1"
	>
		<a
			href="/admin/docs/ui"
			class="flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-center text-[11px] font-medium text-(--color-surface-500-500) hover:text-(--color-primary-600) hover:underline {useCollapsed
				? 'lg:px-1'
				: ''}"
			title={$t('admin.uiDocsTitle')}
			data-sveltekit-reload
			onclick={closeMobile}
		>
			<svg class="h-3.5 w-3.5 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
			</svg>
			<span class="truncate {useCollapsed ? 'lg:sr-only' : ''}">{$t('admin.sidebarDevUiDocs')}</span>
		</a>
	</div>
	<div
		class="shrink-0 border-t border-[color-mix(in_oklab,var(--color-surface-950)_8%,transparent)] dark:border-[color-mix(in_oklab,var(--color-surface-50)_10%,transparent)] p-2 space-y-1"
	>
		<a
			href="/"
			class="btn btn-sm preset-outlined-surface-200-800 w-full justify-center gap-2 {useCollapsed ? 'lg:px-1' : ''}"
			title={useCollapsed ? $t('admin.chromeNavSite') : undefined}
			onclick={closeMobile}
		>
			<svg class="h-4 w-4 shrink-0 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2 0v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
			</svg>
			<span class="truncate {useCollapsed ? 'lg:sr-only' : ''}">{$t('admin.chromeNavSite')}</span>
		</a>
		<button
			type="button"
			class="flex w-full items-center justify-center gap-2 rounded-lg border border-transparent px-2.5 py-2 text-sm font-medium text-(--color-surface-600-400) transition-colors hover:bg-[color-mix(in_oklab,var(--color-surface-950)_5%,transparent)] dark:hover:bg-[color-mix(in_oklab,var(--color-surface-50)_6%,transparent)] {useCollapsed
				? 'lg:px-1'
				: ''}"
			title={useCollapsed ? $t('header.logout') : undefined}
			onclick={handleLogout}
		>
			<svg class="h-4 w-4 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
			</svg>
			<span class="truncate {useCollapsed ? 'lg:sr-only' : ''}">{$t('header.logout')}</span>
		</button>
	</div>
</aside>
