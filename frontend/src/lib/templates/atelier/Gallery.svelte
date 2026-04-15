<script lang="ts">
	import './styles.scss';
	import { onMount } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';
	import { getPhotoRotationStyle } from '$lib/utils/photoUrl';
	import SocialShareButtons from '$lib/components/SocialShareButtons.svelte';
	import { t } from '$stores/i18n';
	import AlbumList from './components/AlbumList.svelte';

	/** `albums` = root album listing (e.g. /albums); `photos` = global photo grid (legacy pack default). */
	export let mode: 'photos' | 'albums' = 'photos';
	export let albums: any[] = [];
	export let loading = false;
	export let error: string | null = null;

	let photos: any[] = [];
	let photosLoading = true;
	let photosError: string | null = null;
	let lightboxOpen = false;
	let lightboxIndex = 0;

	onMount(async () => {
		if (mode === 'albums') return;
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
			photosLoading = true;
			const res = await fetch('/api/photos?limit=50');
			if (!res.ok) throw new Error('Failed to fetch photos');
			const data = await res.json();
			photos = Array.isArray(data) ? data : data.photos || [];
		} catch (err) {
			photosError = err instanceof Error ? err.message : 'Failed to fetch photos';
		} finally {
			photosLoading = false;
		}
	}

	function openLightbox(index: number) {
		lightboxIndex = index;
		lightboxOpen = true;
	}
</script>

{#if mode === 'albums'}
	<div
		class="min-h-screen w-full bg-[color:var(--tp-canvas)] text-[color:var(--tp-fg)] [font-family:var(--os-font-body)]"
	>
		<div class="max-w-[960px] mx-auto px-8 pt-12 pb-6 text-center">
			<h1
				class="text-[28px] font-normal tracking-[0.08em] text-[color:var(--tp-fg)]"
				style="font-family: var(--os-font-heading);"
			>
				{$t('navigation.albums')}
			</h1>
			<div class="w-9 h-px mx-auto my-2.5" style="background: var(--os-primary);"></div>
			<p
				class="text-sm italic leading-relaxed max-w-2xl mx-auto"
				style="font-family: var(--os-font-heading); color: var(--tp-fg-muted);"
			>
				{$t('albums.browsePhotoCollections')}
			</p>
		</div>
		<AlbumList {albums} {loading} {error} pageContext="gallery" />
	</div>
{:else}
	<div
		class="min-h-screen w-full bg-[color:var(--tp-canvas)] text-[color:var(--tp-fg)] [font-family:var(--os-font-body)]"
	>
		<div class="max-w-[960px] mx-auto px-8 pt-12 pb-6 text-center">
			<h1
				class="text-[28px] font-normal tracking-[0.08em] text-[color:var(--tp-fg)]"
				style="font-family: var(--os-font-heading);"
			>
				{$t('albums.galleryTitle')}
			</h1>
			<div class="w-9 h-px mx-auto my-2.5" style="background: var(--os-primary);"></div>
			<p
				class="text-sm italic leading-relaxed max-w-2xl mx-auto"
				style="font-family: var(--os-font-heading); color: var(--tp-fg-muted);"
			>
				{$t('albums.gallerySubtitle')}
			</p>
			<div class="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 mt-6">
				<p class="text-[9px] uppercase tracking-[0.22em] text-[color:var(--tp-fg-subtle)]">
					share
				</p>
				<SocialShareButtons title={$t('albums.galleryTitle')} size="sm" />
			</div>
		</div>

		{#if photosLoading}
			<div class="text-center py-20">
				<div
					class="w-8 h-8 border rounded-full animate-spin mx-auto mb-4 border-[color:var(--tp-border)] border-t-[color:var(--tp-fg)]"
				></div>
				<p class="text-[10px] uppercase tracking-[0.2em] text-[color:var(--tp-fg-muted)]">
					{$t('loading.loadingGallery')}
				</p>
			</div>
		{:else if photosError}
			<p class="text-center text-sm text-red-400/90 px-8">{photosError}</p>
		{:else if photos.length === 0}
			<p class="text-center text-[13px] text-[color:var(--tp-fg-muted)] px-8 pb-16">
				{$t('albums.noAlbumsText')}
			</p>
		{:else}
			<div class="max-w-[960px] mx-auto px-8 pb-16">
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{#each photos as photo, index}
						<button
							type="button"
							on:click={() => openLightbox(index)}
							class="group text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--tp-fg-muted)] rounded-sm"
						>
							<div class="overflow-hidden rounded-sm mb-2.5">
								{#if photo.storage?.thumbnailPath || photo.storage?.url || photo.url}
									<img
										src={photo.storage?.thumbnailPath || photo.storage?.url || photo.url}
										alt={MultiLangUtils.getTextValue(photo.title, $currentLanguage) || 'Photo'}
										class="w-full aspect-[3/4] object-cover transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-[1.03]"
										style="image-orientation: from-image; {getPhotoRotationStyle(photo)}"
									/>
								{:else}
									<div
										class="w-full aspect-[3/4] bg-[color:color-mix(in_srgb,var(--os-primary)_22%,var(--tp-surface-3))]"
									></div>
								{/if}
							</div>
							<div
								class="text-sm text-center transition-colors group-hover:text-[color:var(--os-primary)]"
								style="font-family: var(--os-font-heading); color: var(--tp-fg);"
							>
								{MultiLangUtils.getTextValue(photo.title, $currentLanguage) || '—'}
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	{#if lightboxOpen && photos.length > 0}
		<PhotoLightbox photos={photos} initialIndex={lightboxIndex} on:close={() => (lightboxOpen = false)} />
	{/if}
{/if}
