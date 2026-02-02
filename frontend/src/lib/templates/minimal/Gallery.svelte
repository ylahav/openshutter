<script lang="ts">
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
import { MultiLangUtils } from '$utils/multiLang';
import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';
import { getPhotoRotationStyle } from '$lib/utils/photoUrl';
import SocialShareButtons from '$lib/components/SocialShareButtons.svelte';

	let photos: any[] = [];
	let loading = true;
	let error: string | null = null;
	let lightboxOpen = false;
	let lightboxIndex = 0;

	onMount(async () => {
		await fetchPhotos();
		// Open lightbox at photo from hash (#p=index) when sharing a single photo
		if (photos.length > 0 && typeof window !== 'undefined') {
			const m = window.location.hash.match(/^#p=(\d+)$/);
			if (m) {
				const idx = parseInt(m[1], 10);
				if (idx >= 0 && idx < photos.length) {
					lightboxIndex = idx;
					lightboxOpen = true;
				}
			}
		}
	});

	async function fetchPhotos() {
		try {
			loading = true;
			const res = await fetch('/api/photos?limit=50');
			if (!res.ok) throw new Error('Failed to fetch photos');
			const data = await res.json();
			photos = Array.isArray(data) ? data : data.photos || [];
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to fetch photos';
		} finally {
			loading = false;
		}
	}

	function openLightbox(index: number) {
		lightboxIndex = index;
		lightboxOpen = true;
	}
</script>

<div class="min-h-screen bg-white">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
			<h1 class="text-3xl font-light text-black tracking-tight">Photo Gallery</h1>
			<div class="md:text-right">
				<p class="text-xs uppercase tracking-wide text-gray-500 mb-1">Share gallery</p>
				<SocialShareButtons title="Photo Gallery" size="sm" />
			</div>
		</div>

		{#if loading}
			<div class="text-center py-12">
				<div class="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
				<p class="text-sm text-gray-600">Loading photos...</p>
			</div>
		{:else if error}
			<div class="text-center py-12">
				<p class="text-sm text-black">{error}</p>
			</div>
		{:else if photos.length === 0}
			<div class="text-center py-12">
				<p class="text-sm text-gray-600">No photos available yet.</p>
			</div>
		{:else}
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
				{#each photos as photo, index}
					<button
						on:click={() => openLightbox(index)}
						class="relative aspect-square bg-gray-100 overflow-hidden hover:opacity-80 transition-opacity"
					>
						{#if photo.storage?.thumbnailPath || photo.storage?.url || photo.url}
							<img
								src={photo.storage?.thumbnailPath || photo.storage?.url || photo.url}
								alt={MultiLangUtils.getTextValue(photo.title, $currentLanguage) || 'Photo'}
								class="w-full h-full object-cover"
								style="image-orientation: from-image; {getPhotoRotationStyle(photo)}"
							/>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Photo Lightbox -->
{#if lightboxOpen && photos.length > 0}
	<PhotoLightbox photos={photos} initialIndex={lightboxIndex} on:close={() => (lightboxOpen = false)} />
{/if}
