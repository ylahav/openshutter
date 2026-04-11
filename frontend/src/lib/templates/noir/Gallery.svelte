<script lang="ts">
	import './styles.scss';
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';
	import { getPhotoRotationStyle } from '$lib/utils/photoUrl';
	import SocialShareButtons from '$lib/components/SocialShareButtons.svelte';
	import { t } from '$stores/i18n';

	let photos: any[] = [];
	let loading = true;
	let error: string | null = null;
	let lightboxOpen = false;
	let lightboxIndex = 0;

	onMount(async () => {
		await fetchPhotos();
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

<div class="gal-page min-h-screen w-full bg-[color:var(--tp-canvas)] text-[color:var(--tp-fg)] [font-family:var(--os-font-body)]">
	<div class="gal-hdr">
		<h1 class="gal-title lowercase">
				{$t('albums.galleryTitle')}
		</h1>
		<div class="flex items-center gap-4">
			<span class="sec-count">{String(photos.length).padStart(2, '0')} {$t('albums.photos')}</span>
			<SocialShareButtons title={$t('albums.galleryTitle')} size="sm" />
		</div>
	</div>

	<div>
		{#if loading}
			<div class="text-center py-20">
				<div
					class="w-8 h-8 border rounded-full animate-spin mx-auto mb-4 border-[color:var(--tp-border)] border-t-[color:var(--tp-fg)]"
				></div>
				<p class="text-[10px] uppercase tracking-[0.2em] text-[color:var(--tp-fg-muted)]">
					{$t('loading.loadingGallery')}
				</p>
			</div>
		{:else if error}
			<p class="text-center text-sm text-red-400/90">{error}</p>
		{:else if photos.length === 0}
			<p class="text-center text-[10px] uppercase tracking-[0.2em] text-[color:var(--tp-fg-muted)]">
				{$t('albums.noAlbumsText')}
			</p>
		{:else}
			<div class="album-grid">
				{#each photos as photo, index}
					<button
						type="button"
						on:click={() => openLightbox(index)}
						class="ac focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tp-fg-muted)]"
					>
						{#if photo.storage?.thumbnailPath || photo.storage?.url || photo.url}
							<img
								src={photo.storage?.thumbnailPath || photo.storage?.url || photo.url}
								alt={MultiLangUtils.getTextValue(photo.title, $currentLanguage) || 'Photo'}
								class="ac-img"
								style="image-orientation: from-image; {getPhotoRotationStyle(photo)}"
							/>
						{/if}
						<div class="ac-ov"></div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

{#if lightboxOpen && photos.length > 0}
	<PhotoLightbox photos={photos} initialIndex={lightboxIndex} on:close={() => (lightboxOpen = false)} />
{/if}
