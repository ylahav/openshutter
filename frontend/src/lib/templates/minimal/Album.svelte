<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import { browser } from '$app/environment';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import AlbumBreadcrumbs from '$lib/components/AlbumBreadcrumbs.svelte';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';

	interface AlbumData {
		album: {
			_id: string;
			name: any;
			description?: any;
			alias: string;
			photoCount?: number;
		};
		subAlbums: any[];
		photos: any[];
	}

	let alias = $page.params.alias || $page.params.id;
	let albumData: AlbumData | null = null;
	let loading = true;
	let error: string | null = null;
	let lightboxOpen = false;
	let lightboxIndex = 0;
	let isInitialLoad = true;

	// React to route parameter changes
	afterNavigate(({ to, from }) => {
		if (!browser) return;
		
		const newAlias = to?.params?.alias || to?.params?.id;
		const oldAlias = from?.params?.alias || from?.params?.id;
		
		// Only fetch if the alias actually changed (not on initial load)
		if (newAlias && newAlias !== oldAlias) {
			alias = newAlias;
			fetchAlbumData();
		} else if (isInitialLoad && newAlias) {
			// Handle initial load
			alias = newAlias;
			fetchAlbumData();
			isInitialLoad = false;
		}
	});

	onMount(async () => {
		if (alias && isInitialLoad) {
			await fetchAlbumData();
			isInitialLoad = false;
		}
	});

	async function fetchAlbumData() {
		if (!alias || !browser) return;
		try {
			loading = true;
			error = null;
			const res = await fetch(`/api/albums/${encodeURIComponent(alias)}/data?page=1&limit=50&t=${Date.now()}`, {
				cache: 'no-store'
			});
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({ error: 'Album not found' }));
				throw new Error(errorData.error || 'Album not found');
			}
			const data = await res.json();
			albumData = data;
			console.log('Album data loaded:', albumData);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch album';
			albumData = null;
		} finally {
			loading = false;
		}
	}

	function openLightbox(index: number) {
		lightboxIndex = index;
		lightboxOpen = true;
	}
</script>

{#if loading}
	<div class="min-h-screen flex items-center justify-center bg-white">
		<div class="text-center">
			<div class="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<p class="text-sm text-gray-600">Loading album...</p>
		</div>
	</div>
{:else if error}
	<div class="min-h-screen flex items-center justify-center bg-white">
		<div class="text-center">
			<p class="text-sm text-black">{error}</p>
		</div>
	</div>
{:else if albumData}
	<div class="min-h-screen bg-white">
		<!-- Breadcrumbs -->
		{#if albumData.album}
			<AlbumBreadcrumbs albumId={albumData.album._id} />
		{/if}

		<!-- Album Header -->
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<h1 class="text-3xl font-light text-black mb-4 tracking-tight">
				{MultiLangUtils.getTextValue(albumData.album.name, $currentLanguage)}
			</h1>
			{#if albumData.album.description}
				<div class="prose prose-sm max-w-4xl mb-6 text-gray-600">
					{@html MultiLangUtils.getHTMLValue(albumData.album.description, $currentLanguage)}
				</div>
			{/if}
		</div>

		<!-- Sub-albums -->
		{#if albumData.subAlbums && albumData.subAlbums.length > 0}
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-200">
				<h2 class="text-xl font-light text-black mb-4 tracking-tight">Sub-albums</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					{#each albumData.subAlbums as subAlbum}
						<a
							href={`/albums/${subAlbum.alias || subAlbum._id}`}
							class="bg-white border border-black hover:border-gray-600 transition-colors p-4"
						>
							<h3 class="text-base font-normal text-black mb-1">
								{MultiLangUtils.getTextValue(subAlbum.name, $currentLanguage)}
							</h3>
							<p class="text-xs text-gray-600">
								{#if subAlbum.photoCount && subAlbum.photoCount > 0}
									{subAlbum.photoCount} photos
								{/if}
								{#if subAlbum.photoCount && subAlbum.photoCount > 0 && subAlbum.childAlbumCount && subAlbum.childAlbumCount > 0}
									• 
								{/if}
								{#if subAlbum.childAlbumCount && subAlbum.childAlbumCount > 0}
									{subAlbum.childAlbumCount} {subAlbum.childAlbumCount === 1 ? 'album' : 'albums'}
								{/if}
							</p>
						</a>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Photos Grid -->
		{#if albumData.photos && albumData.photos.length > 0}
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-200">
				<h2 class="text-xl font-light text-black mb-4 tracking-tight">Photos</h2>
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
					{#each albumData.photos as photo, index}
						<button
							on:click={() => openLightbox(index)}
							class="relative aspect-square bg-gray-100 overflow-hidden hover:opacity-80 transition-opacity"
						>
							{#if photo.storage?.thumbnailPath || photo.storage?.url || photo.url}
								<img
									src={photo.storage?.thumbnailPath || photo.storage?.url || photo.url}
									alt={MultiLangUtils.getTextValue(photo.title, $currentLanguage) || 'Photo'}
									class="w-full h-full object-cover"
									style="image-orientation: from-image;"
								/>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{:else}
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-200">
				<p class="text-sm text-gray-600 text-center">No photos in this album yet.</p>
			</div>
		{/if}
	</div>

	<!-- Photo Lightbox -->
	{#if lightboxOpen && albumData.photos}
		<PhotoLightbox
			photos={albumData.photos}
			initialIndex={lightboxIndex}
			on:close={() => (lightboxOpen = false)}
		/>
	{/if}
{/if}
