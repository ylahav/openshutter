<script lang="ts">
	import { onMount } from 'svelte';
	import { productName, siteConfigData } from '$stores/siteConfig';
	import { t } from '$stores/i18n';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { viewportWidth } from '$lib/stores/viewport';
	import { getEffectivePageGrid, getEffectivePageModules } from '$lib/template/breakpoints';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import GalleryTemplateSwitcher from '$lib/components/GalleryTemplateSwitcher.svelte';
	import type { PageModuleData } from '$lib/types/page-builder';

	interface Album {
		_id: string;
		name: string | { en?: string; he?: string };
		description?: string | { en?: string; he?: string };
		alias: string;
		level: number;
		isFeatured: boolean;
		isPublic: boolean;
		photoCount: number;
		childAlbumCount?: number;
		coverPhotoId?: string;
		coverPhoto?: any;
	}

	let albums: Album[] = [];
	let isLoading = true;
	let error = '';

	$: galleryModules = getEffectivePageModules($siteConfigData?.template, 'gallery', $viewportWidth) as PageModuleData[];
	$: galleryLayout = getEffectivePageGrid($siteConfigData?.template, 'gallery', $viewportWidth);
	$: hasPageModules = Array.isArray(galleryModules) && galleryModules.length > 0;
	$: pageForRenderer = hasPageModules
		? ({
				_id: 'gallery',
				title: {} as any,
				subtitle: {} as any,
				layout: { gridRows: galleryLayout.gridRows, gridColumns: galleryLayout.gridColumns }
			} as any)
		: null;

	async function fetchAlbums() {
		try {
			isLoading = true;
			error = '';
			const response = await fetch('/api/albums?parentId=root');
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const data = await response.json();
			if (Array.isArray(data)) {
				albums = data.sort((a: Album, b: Album) => ((a as any).order || 0) - ((b as any).order || 0));
			} else {
				logger.error('API returned unexpected format:', data);
				albums = [];
			}
		} catch (err) {
			logger.error('Failed to fetch albums:', err);
			error = handleError(err, 'Failed to load albums');
			albums = [];
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		fetchAlbums();
	});
</script>

<svelte:head>
	<title>Albums - {$productName}</title>
</svelte:head>

{#if hasPageModules}
	<PageRenderer page={pageForRenderer as any} modules={galleryModules} />
{:else}
	<GalleryTemplateSwitcher mode="albums" {albums} loading={isLoading} error={error || null} />
{/if}
