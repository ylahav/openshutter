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
	<div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-white">
		<div class="text-center">
			<div class="w-10 h-10 border-3 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<p class="text-sm text-gray-600 font-light">Loading album...</p>
		</div>
	</div>
{:else if error}
	<div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-purple-50 to-white">
		<div class="text-center">
			<p class="text-sm text-red-600 font-light">{error}</p>
		</div>
	</div>
{:else if albumData}
	<div class="min-h-screen bg-gradient-to-b from-purple-50 to-white">
		<!-- Breadcrumbs -->
		{#if albumData.album}
			<AlbumBreadcrumbs albumId={albumData.album._id} />
		{/if}

		<!-- Album Header -->
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
			<h1 class="text-4xl md:text-5xl font-serif text-gray-900 mb-6 tracking-wide" style="font-family: 'Playfair Display', serif;">
				{MultiLangUtils.getTextValue(albumData.album.name, $currentLanguage)}
			</h1>
			{#if albumData.album.description}
				<div class="prose prose-lg max-w-4xl mx-auto mb-8 text-gray-700">
					{@html MultiLangUtils.getHTMLValue(albumData.album.description, $currentLanguage)}
				</div>
			{/if}
		</div>

		<!-- Sub-albums -->
		{#if albumData.subAlbums && albumData.subAlbums.length > 0}
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-purple-100">
				<h2 class="text-2xl font-serif text-gray-900 mb-6 tracking-wide" style="font-family: 'Playfair Display', serif;">
					Sub-albums
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					{#each albumData.subAlbums as subAlbum}
						<a
							href={`/albums/${subAlbum.alias || subAlbum._id}`}
							class="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 transform hover:-translate-y-1"
						>
							<h3 class="text-lg font-serif text-gray-900 mb-2" style="font-family: 'Playfair Display', serif;">
								{MultiLangUtils.getTextValue(subAlbum.name, $currentLanguage)}
							</h3>
							<p class="text-sm text-gray-600 font-light">
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
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-purple-100">
				<h2 class="text-2xl font-serif text-gray-900 mb-6 tracking-wide" style="font-family: 'Playfair Display', serif;">
					Photos
				</h2>
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
					{#each albumData.photos as photo, index}
						<button
							on:click={() => openLightbox(index)}
							class="relative aspect-square bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
						>
							{#if photo.storage?.thumbnailPath || photo.storage?.url || photo.url}
								<img
									src={photo.storage?.thumbnailPath || photo.storage?.url || photo.url}
									alt={MultiLangUtils.getTextValue(photo.title, $currentLanguage) || 'Photo'}
									class="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
									style="image-orientation: from-image;"
								/>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{:else}
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-purple-100">
				<p class="text-sm text-gray-600 text-center font-light">No photos in this album yet.</p>
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
