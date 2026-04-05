<script lang="ts">
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { siteConfigData } from '$stores/siteConfig';
	import { logger } from '$lib/utils/logger';
	import Hero from './components/Hero.svelte';
	import AlbumList from './components/AlbumList.svelte';

	let rootAlbums: any[] = [];
	let loading = true;
	let error: string | null = null;

	onMount(async () => {
		await fetchRootAlbums();
	});

	async function fetchRootAlbums() {
		try {
			loading = true;
			const response = await fetch('/api/albums?parentId=root');
			if (!response.ok) {
				throw new Error('Failed to fetch albums');
			}
			const albums = await response.json();
			if (Array.isArray(albums)) {
				rootAlbums = albums;
			} else {
				error = 'Failed to fetch albums';
			}
		} catch (err) {
			logger.error('Failed to fetch albums:', err);
			error = err instanceof Error ? err.message : 'Failed to fetch albums';
		} finally {
			loading = false;
		}
	}

	$: isHeroVisible = $siteConfigData?.template?.componentsConfig?.hero?.visible !== false;
</script>

<div
	class="min-h-screen bg-gradient-to-b from-white via-slate-50/90 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100"
>
	{#if isHeroVisible}
		<Hero />
	{/if}

	<AlbumList albums={rootAlbums} {loading} {error} />
</div>
