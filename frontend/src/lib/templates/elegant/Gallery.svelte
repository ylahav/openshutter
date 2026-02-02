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

<div class="min-h-screen bg-gradient-to-b from-purple-50 to-white">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
		<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
			<h1
				class="text-4xl md:text-5xl font-serif text-gray-900 tracking-wide"
				style="font-family: 'Playfair Display', serif;"
			>
				Photo Gallery
			</h1>
			<div class="md:text-right">
				<p class="text-xs uppercase tracking-wide text-gray-500 mb-1">Share gallery</p>
				<SocialShareButtons title="Photo Gallery" size="sm" />
			</div>
		</div>

		{#if loading}
			<div class="text-center py-16">
				<div class="w-10 h-10 border-3 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
				<p class="text-sm text-gray-600 font-light">Loading photos...</p>
			</div>
		{:else if error}
			<div class="text-center py-16">
				<p class="text-sm text-red-600 font-light">{error}</p>
			</div>
		{:else if photos.length === 0}
			<div class="text-center py-16">
				<p class="text-sm text-gray-600 font-light">No photos available yet.</p>
			</div>
		{:else}
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
				{#each photos as photo, index}
					<button
						on:click={() => openLightbox(index)}
						class="relative aspect-square bg-linear-to-b from-purple-100 to-indigo-100 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
					>
						{#if photo.storage?.thumbnailPath || photo.storage?.url || photo.url}
							<img
								src={photo.storage?.thumbnailPath || photo.storage?.url || photo.url}
								alt={MultiLangUtils.getTextValue(photo.title, $currentLanguage) || 'Photo'}
								class="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
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
