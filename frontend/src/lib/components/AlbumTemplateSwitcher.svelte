<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { activeTemplate } from '$stores/template';
	import { siteConfigData } from '$stores/siteConfig';
	import { getTemplatePack } from '$lib/template/packs/registry';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import type { PageModuleData } from '$lib/types/page-builder';
	import { getEffectivePageGrid, getEffectivePageModules } from '$lib/template/breakpoints';
	import { viewportWidth } from '$lib/stores/viewport';
	import { logger } from '$lib/utils/logger';

	$: packPromise = getTemplatePack($activeTemplate);

	let rolePageModules: PageModuleData[] = [];
	let rolePageLayout: { gridRows?: number; gridColumns?: number } | null = null;
	let rolePageLoadedForPack = '';

	// Backward-compatible fallback: template overrides in site_config.
	$: pageModulesRaw = getEffectivePageModules($siteConfigData?.template, 'album', $viewportWidth);
	$: fallbackModules = (Array.isArray(pageModulesRaw) ? pageModulesRaw : []) as PageModuleData[];
	$: hasRolePageModules = Array.isArray(rolePageModules) && rolePageModules.length > 0;
	$: pageModules = (hasRolePageModules ? rolePageModules : fallbackModules) as PageModuleData[];
	$: routeParams = ($page?.params || {}) as Record<string, string | undefined>;
	$: routeAlias = routeParams?.albumAlias || routeParams?.alias || null;
	$: isAlbumDetailRoute =
		(typeof routeAlias === 'string' && routeAlias.trim().length > 0) ||
		(/^\/albums\/[^/?#]+/.test($page?.url?.pathname || ''));
	$: normalizedPageModules = normalizeAlbumDetailModules(pageModules, isAlbumDetailRoute);
	$: hasPageModules = normalizedPageModules.length > 0;
	$: pageLayout = getEffectivePageGrid($siteConfigData?.template, 'album', $viewportWidth);
	$: effectiveLayout = hasRolePageModules
		? rolePageLayout ?? pageLayout
		: pageLayout;

	$: pageForRenderer = hasPageModules
		? ({
				_id: 'album',
				title: {} as any,
				subtitle: {} as any,
				layout: effectiveLayout
					? { gridRows: effectiveLayout.gridRows, gridColumns: effectiveLayout.gridColumns }
					: undefined
			} as any)
		: null;

	function normalizeAlbumDetailModules(modules: PageModuleData[], onAlbumDetailRoute: boolean): PageModuleData[] {
		const list = Array.isArray(modules) ? [...modules] : [];
		if (!onAlbumDetailRoute || list.length === 0) return list;

		let hasAlbumView = false;
		const normalized = list.map((m) => {
			const type = String((m as any)?.type || '');
			if (type === 'albumView' || type === 'albumGallery') {
				hasAlbumView = true;
				return {
					...m,
					type: 'albumView',
					props: { ...(m?.props || {}), albumSource: 'current' }
				} as PageModuleData;
			}
			return m;
		});

		if (hasAlbumView) return normalized;

		const firstAlbumsGridIndex = normalized.findIndex((m) => String((m as any)?.type || '') === 'albumsGrid');
		if (firstAlbumsGridIndex >= 0) {
			const grid = normalized[firstAlbumsGridIndex];
			normalized[firstAlbumsGridIndex] = {
				...grid,
				type: 'albumView',
				props: { ...(grid?.props || {}), albumSource: 'current' }
			} as PageModuleData;
		}

		return normalized;
	}

	async function loadAlbumRolePage() {
		const pack = String($activeTemplate || '').trim();
		if (!pack || rolePageLoadedForPack === pack) return;
		try {
			const res = await fetch(`/api/pages/album?role=album&pack=${encodeURIComponent(pack)}`, {
				credentials: 'include'
			});
			const result = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(result?.error || 'Failed to load album role page');
			const data = result?.success ? result.data : result;
			rolePageModules = Array.isArray(data?.modules) ? (data.modules as PageModuleData[]) : [];
			rolePageLayout =
				data?.page?.layout && typeof data.page.layout === 'object'
					? {
							gridRows: Number((data.page.layout as any).gridRows) || undefined,
							gridColumns: Number((data.page.layout as any).gridColumns) || undefined
						}
					: null;
			rolePageLoadedForPack = pack;
		} catch (err) {
			logger.warn('Album role page fetch failed, using template overrides fallback:', err);
			rolePageModules = [];
			rolePageLayout = null;
			rolePageLoadedForPack = pack;
		}
	}

	$: if ($activeTemplate) {
		loadAlbumRolePage();
	}

	onMount(() => {
		loadAlbumRolePage();
	});
</script>

{#if hasPageModules}
	<PageRenderer page={pageForRenderer} modules={normalizedPageModules} />
{:else}
	{#await packPromise then pack}
		<svelte:component this={pack.pages.Album} />
	{/await}
{/if}
