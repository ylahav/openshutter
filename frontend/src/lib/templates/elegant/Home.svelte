<script lang="ts">
	import type { PageData } from '../../../routes/$types';
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { siteConfigData } from '$stores/siteConfig';
	import Hero from './components/Hero.svelte';
	import AlbumList from './components/AlbumList.svelte';

	export let data: PageData;

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
			console.error('Failed to fetch albums:', err);
			error = err instanceof Error ? err.message : 'Failed to fetch albums';
		} finally {
			loading = false;
		}
	}

	$: isHeroVisible = $siteConfigData?.template?.componentsConfig?.hero?.visible !== false;
</script>

<div class="min-h-screen bg-black relative overflow-hidden">
	<!-- Animated background -->
	<div class="fixed inset-0 opacity-30 pointer-events-none">
		<div class="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse"></div>
		<div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500 rounded-full filter blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
	</div>
	
	<div class="relative z-10">
		{#if isHeroVisible}
			<Hero />
		{/if}

		<AlbumList albums={rootAlbums} {loading} {error} />
	</div>
</div>
