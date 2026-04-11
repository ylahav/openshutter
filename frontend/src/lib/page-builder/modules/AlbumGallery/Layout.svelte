<!-- frontend/src/lib/page-builder/modules/AlbumGallery/Layout.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { getAlbumName } from '$lib/utils/albumUtils';
	import { logger } from '$lib/utils/logger';
	import PhotoLightbox from '$lib/components/PhotoLightbox.svelte';
	import { getPhotoFullUrl, getPhotoUrl } from '$lib/utils/photoUrl';
	import AlbumCard from './AlbumCard.svelte';
	import PhotoCard from './PhotoCard.svelte';

	type AlbumCardSortBy = 'manual' | 'order' | 'name' | 'photoCount' | 'createdAt' | 'lastPhotoDate';
	type AlbumCardField = 'title' | 'cover' | 'description' | 'photoCount' | 'featuredBadge';
	const DEFAULT_CARD_FIELD_ORDER: AlbumCardField[] = ['cover', 'title', 'description', 'photoCount', 'featuredBadge'];
	type AlbumGalleryLayoutConfig = {
		title?: string | Record<string, string>;
		description?: string | Record<string, string>;
		albumHeaderFieldOrder?: Array<'albumTitle' | 'albumDescription' | 'albumStats'>;
		showAlbumPageTitle?: boolean;
		showAlbumPageDescription?: boolean;
		showAlbumPageStats?: boolean;
		albumSource?: 'root' | 'featured' | 'selected' | 'current';
		selectedAlbums?: string[];
		rootAlbumId?: string;
		rootGallery?: string;
		includeRoot?: boolean;
		showTitle?: boolean;
		showAlbumTitle?: boolean;
		showPhotoTitle?: boolean;
		showCover?: boolean;
		coverAspect?: 'video' | 'square' | 'portrait';
		showDescription?: boolean;
		showAlbumDescription?: boolean;
		showPhotoDescription?: boolean;
		descriptionLines?: number;
		cardFieldOrder?: AlbumCardField[];
		albumCardFieldOrder?: AlbumCardField[];
		photoCardFieldOrder?: Array<'title' | 'cover' | 'description' | 'featuredBadge'>;
		// Legacy saved shape, kept for backward compatibility
		cardLayout?: 'photoTitleDescription' | 'titlePhotoDescription';
		showPhotoCount?: boolean;
		showFeaturedBadge?: boolean;
		showAlbumFeaturedBadge?: boolean;
		showPhotoFeaturedBadge?: boolean;
		cardDataType?: 'subAlbums' | 'photos' | 'both';
		mixedDisplayMode?: 'grouped' | 'interleaved';
		showSectionLabels?: boolean;
		sortBy?: AlbumCardSortBy;
		sortDirection?: 'asc' | 'desc';
		limit?: number;
	};

	type AlbumCard = {
		cardType?: 'subAlbum' | 'photo';
		_id?: string;
		alias?: string;
		name?: string | Record<string, string>;
		description?: string | Record<string, string>;
		coverUrl?: string;
		photoCount?: number;
		isFeatured?: boolean;
		order?: number;
		createdAt?: string | Date;
		lastPhotoDate?: string | Date;
	};

	export let config: AlbumGalleryLayoutConfig = {};
	export let data: any = null;

	let sortBy: AlbumCardSortBy = 'manual';
	let sortDirection: 'asc' | 'desc' = 'asc';

	$: titleText = MultiLangUtils.getTextValue(config?.title, $currentLanguage) || '';
	$: descriptionHTML = config?.description ? MultiLangUtils.getHTMLValue(config.description, $currentLanguage) : '';
	$: albumHeaderFieldOrder = (() => {
		const def: Array<'albumTitle' | 'albumDescription' | 'albumStats'> = ['albumTitle', 'albumDescription', 'albumStats'];
		const raw = Array.isArray(config?.albumHeaderFieldOrder) ? config.albumHeaderFieldOrder : def;
		const valid = raw.filter(
			(f): f is 'albumTitle' | 'albumDescription' | 'albumStats' =>
				f === 'albumTitle' || f === 'albumDescription' || f === 'albumStats'
		);
		const unique = Array.from(new Set(valid));
		return unique.length ? unique : def;
	})();
	$: showAlbumPageTitle = config?.showAlbumPageTitle !== false;
	$: showAlbumPageDescription = config?.showAlbumPageDescription !== false;
	$: showAlbumPageStats = config?.showAlbumPageStats !== false;
	/** 'root' = root-level albums only (no children), 'featured' = all featured albums (flattened), 'selected' = specific album IDs, 'current' = album from URL (alias) */
	$: albumSource = config?.albumSource ?? 'root';
	$: selectedAlbums = Array.isArray(config?.selectedAlbums)
		? config.selectedAlbums
		: [config?.rootAlbumId, config?.rootGallery].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
	$: includeRoot = config?.includeRoot ?? true;
	$: showTitle = config?.showTitle !== false;
	$: showAlbumTitle = config?.showAlbumTitle ?? showTitle;
	$: showPhotoTitle = config?.showPhotoTitle ?? showTitle;
	$: showCover = config?.showCover !== false;
	$: coverAspect = config?.coverAspect === 'square' || config?.coverAspect === 'portrait' ? config.coverAspect : 'video';
	$: showDescription = config?.showDescription !== false;
	$: showAlbumDescription = config?.showAlbumDescription ?? showDescription;
	$: showPhotoDescription = config?.showPhotoDescription ?? showDescription;
	$: descriptionLines = Math.min(6, Math.max(1, Number(config?.descriptionLines) || 2));
	$: cardFieldOrder = (() => {
		const legacyOrder: AlbumCardField[] =
			config?.cardLayout === 'titlePhotoDescription'
				? ['title', 'cover', 'description', 'photoCount', 'featuredBadge']
				: DEFAULT_CARD_FIELD_ORDER;
		const raw = Array.isArray(config?.cardFieldOrder) ? config.cardFieldOrder : legacyOrder;
		const valid = raw.filter((f): f is AlbumCardField => DEFAULT_CARD_FIELD_ORDER.includes(f as AlbumCardField));
		const unique = Array.from(new Set(valid));
		return unique.length ? unique : DEFAULT_CARD_FIELD_ORDER;
	})();
	$: albumCardFieldOrder = (() => {
		const raw = Array.isArray(config?.albumCardFieldOrder) ? config.albumCardFieldOrder : cardFieldOrder;
		const valid = raw.filter((f): f is AlbumCardField => DEFAULT_CARD_FIELD_ORDER.includes(f as AlbumCardField));
		const unique = Array.from(new Set(valid));
		return unique.length ? unique : DEFAULT_CARD_FIELD_ORDER;
	})();
	$: photoCardFieldOrder = (() => {
		const defaultPhotoOrder: Array<'cover' | 'title' | 'description' | 'featuredBadge'> = ['cover', 'title', 'description', 'featuredBadge'];
		const raw = Array.isArray(config?.photoCardFieldOrder)
			? config.photoCardFieldOrder
			: cardFieldOrder.filter((f): f is 'cover' | 'title' | 'description' | 'featuredBadge' => f !== 'photoCount');
		const valid = raw.filter(
			(f): f is 'cover' | 'title' | 'description' | 'featuredBadge' =>
				f === 'cover' || f === 'title' || f === 'description' || f === 'featuredBadge'
		);
		const unique = Array.from(new Set(valid));
		return unique.length ? unique : defaultPhotoOrder;
	})();
	$: showPhotoCount = config?.showPhotoCount !== false;
	$: showFeaturedBadge = config?.showFeaturedBadge !== false;
	$: showAlbumFeaturedBadge = config?.showAlbumFeaturedBadge ?? showFeaturedBadge;
	$: showPhotoFeaturedBadge = config?.showPhotoFeaturedBadge ?? showFeaturedBadge;
	$: cardDataType =
		config?.cardDataType === 'subAlbums' || config?.cardDataType === 'photos' || config?.cardDataType === 'both'
			? config.cardDataType
			: 'both';
	$: mixedDisplayMode = config?.mixedDisplayMode === 'interleaved' ? 'interleaved' : 'grouped';
	$: showSectionLabels = config?.showSectionLabels !== false;
	$: sortBy = (
		config?.sortBy === 'order' ||
		config?.sortBy === 'name' ||
		config?.sortBy === 'photoCount' ||
		config?.sortBy === 'createdAt' ||
		config?.sortBy === 'lastPhotoDate'
	) ? config.sortBy : 'manual';
	$: sortDirection = config?.sortDirection === 'desc' ? 'desc' : 'asc';
	$: maxItems = Math.min(60, Math.max(1, Number(config?.limit) || 12));

	$: sortedAlbums = (() => {
		const list: AlbumCard[] = Array.isArray(albums) ? [...albums] : [];
		if (sortBy === 'manual') {
			// "Manual" should respect explicit per-item order when present.
			// Fall back to source order for items without order.
			const withIndex = list.map((item, idx) => ({ item, idx }));
			withIndex.sort((a, b) => {
				const aoRaw = Number((a.item as any).order);
				const boRaw = Number((b.item as any).order);
				const ao = Number.isFinite(aoRaw) ? aoRaw : Number.POSITIVE_INFINITY;
				const bo = Number.isFinite(boRaw) ? boRaw : Number.POSITIVE_INFINITY;
				if (ao !== bo) return ao - bo;
				return a.idx - b.idx;
			});
			return withIndex.map((x) => x.item).slice(0, maxItems);
		}

		const dir = sortDirection === 'desc' ? -1 : 1;
		list.sort((a, b) => {
			if (sortBy === 'name') {
				return getAlbumName(a).localeCompare(getAlbumName(b), undefined, { sensitivity: 'base' }) * dir;
			}
			if (sortBy === 'photoCount') {
				const ap = Number((a as any).photoCount) || 0;
				const bp = Number((b as any).photoCount) || 0;
				return ((ap - bp) || getAlbumName(a).localeCompare(getAlbumName(b))) * dir;
			}
			if (sortBy === 'createdAt') {
				return (((new Date(a.createdAt ?? 0).getTime()) - (new Date(b.createdAt ?? 0).getTime())) || getAlbumName(a).localeCompare(getAlbumName(b))) * dir;
			}
			if (sortBy === 'lastPhotoDate') {
				return (((new Date(a.lastPhotoDate ?? 0).getTime()) - (new Date(b.lastPhotoDate ?? 0).getTime())) || getAlbumName(a).localeCompare(getAlbumName(b))) * dir;
			}
			const ao = Number((a as any).order) || 0;
			const bo = Number((b as any).order) || 0;
			return ((ao - bo) || getAlbumName(a).localeCompare(getAlbumName(b))) * dir;
		});
		return list.slice(0, maxItems);
	})();

	$: coverAspectClass = coverAspect === 'square' ? 'aspect-square' : coverAspect === 'portrait' ? 'aspect-[3/4]' : 'aspect-video';
	$: albumItems = sortedAlbums.filter((item) => item.cardType !== 'photo');
	$: photoItems = sortedAlbums.filter((item) => item.cardType === 'photo');
	// Get album alias from page context (URL parameter)
	$: currentAlbumAlias = data?.alias || null;

	let albums: AlbumCard[] = [];
	let loading = true;
	let coverImages: Record<string, string> = {};
	let lastSelectedAlbums: string[] = [];
	let lastAlbumSource: string = '';
	let currentAlbum: any = null;

	$: currentAlbumTitleText = currentAlbum ? MultiLangUtils.getTextValue(currentAlbum?.name, $currentLanguage) : '';
	$: currentAlbumDescriptionHTML = currentAlbum?.description
		? MultiLangUtils.getHTMLValue(currentAlbum.description, $currentLanguage)
		: '';
	$: currentAlbumPhotoCount = Number(currentAlbum?.photoCount) || 0;
	// Prefer sub-albums count from the fetched payload (we store it on `currentAlbum` when available).
	$: currentAlbumSubAlbumCount = Number((currentAlbum as any)?.childAlbumCount) || 0;

	let lightboxOpen = false;
	let lightboxIndex = 0;

	// Lightbox should follow the same photo order as what's currently displayed (manual/interleaved included).
	$: lightboxPhotosSource = sortedAlbums.filter((a) => a.cardType === 'photo');
	$: lightboxIndexById = (() => {
		const m = new Map<string, number>();
		lightboxPhotosSource.forEach((p, idx) => {
			const id = (p as any)?._id;
			if (id != null) m.set(String(id), idx);
		});
		return m;
	})();

	$: lightboxPhotos = lightboxPhotosSource.map((p: any) => ({
		_id: p?._id,
		url: getPhotoFullUrl(p),
		thumbnailUrl: getPhotoUrl(p, { preferThumbnail: true }),
		title: p?.title ?? p?.name ?? p?.filename ?? p?.originalName ?? '',
		description: p?.description,
		takenAt: p?.exif?.dateTimeOriginal,
		exif: p?.exif,
		iptcXmp: p?.iptcXmp,
		rotation: p?.rotation,
		metadata: p?.metadata,
		storage: p?.storage,
		faceRecognition: p?.faceRecognition
	}));

	$: effectiveSelectedAlbums = albumSource === 'selected'
		? (Array.isArray(selectedAlbums) ? selectedAlbums : selectedAlbums ? [selectedAlbums] : [])
		: [];

	$: currentAlbumKey = albumSource === 'current' ? `current:${currentAlbumAlias || 'none'}` : '';
	$: if (browser && (
		JSON.stringify(effectiveSelectedAlbums) !== JSON.stringify(lastSelectedAlbums) || 
		albumSource !== lastAlbumSource ||
		(albumSource === 'current' && currentAlbumKey !== lastAlbumSource)
	)) {
		lastSelectedAlbums = [...effectiveSelectedAlbums];
		lastAlbumSource = albumSource === 'current' ? currentAlbumKey : albumSource;
		loadAlbums();
	}

	onMount(async () => {
		await loadAlbums();
	});

	async function loadAlbums() {
		loading = true;
		try {
			if (albumSource === 'current' && currentAlbumAlias) {
				// Fetch the current album from URL alias
				try {
					const response = await fetch(`/api/albums/${encodeURIComponent(currentAlbumAlias)}/data?page=1&limit=50&t=${Date.now()}`, {
						credentials: 'include',
					});
					if (response.ok) {
						const result = await response.json();
						const albumData = result.success ? result.data : result;
						if (albumData?.album) {
							// Keep a stable "current album" object for header rendering.
							currentAlbum = { ...albumData.album, childAlbumCount: Array.isArray(albumData.subAlbums) ? albumData.subAlbums.length : (albumData.album as any)?.childAlbumCount };
							const subAlbums = Array.isArray(albumData.subAlbums)
								? albumData.subAlbums.map((item: any) => ({ ...item, cardType: 'subAlbum' as const }))
								: [];
							const photos = Array.isArray(albumData.photos)
								? albumData.photos.map((item: any) => ({
									...item,
									cardType: 'photo' as const,
									name: item?.title ?? item?.name ?? item?.filename ?? item?.originalName ?? 'Photo',
									description: item?.description,
									order: typeof item?.order === 'number' ? item.order : (typeof item?.photoOrder === 'number' ? item.photoOrder : undefined),
									coverUrl: item?.thumbnailUrl ?? item?.previewUrl ?? item?.url ?? item?.imageUrl ?? ''
								}))
								: [];
							if (cardDataType === 'subAlbums') albums = subAlbums;
							else if (cardDataType === 'photos') albums = photos;
							else albums = [...subAlbums, ...photos];
							if (albums.some((item) => item.cardType === 'subAlbum')) {
								await fetchCoverImages();
							}
						}
					} else if (response.status === 404) {
						logger.warn(`Album not found: ${currentAlbumAlias}`);
						albums = [];
						currentAlbum = null;
					}
				} catch (err) {
					logger.error(`Failed to fetch current album ${currentAlbumAlias}:`, err);
					albums = [];
					currentAlbum = null;
				}
			} else if (albumSource === 'selected' && effectiveSelectedAlbums && effectiveSelectedAlbums.length > 0) {
				currentAlbum = null;
				const albumPromises = effectiveSelectedAlbums.map(async (albumId) => {
					try {
						const response = await fetch(`/api/albums/${albumId}`);
						if (response.ok) {
							return await response.json();
						}
					} catch (err) {
						logger.error(`Failed to fetch album ${albumId}:`, err);
					}
					return null;
				});

				const fetchedAlbums = await Promise.all(albumPromises);
				albums = fetchedAlbums.filter(
					(album) => album && (album.isPublic || album.isFeatured)
				);

				if (albums.length > 0) {
					await fetchCoverImages();
				}
			} else {
				currentAlbum = null;
				if (albumSource === 'root') {
					// For 'root', fetch only root-level albums (parentAlbumId=null)
					try {
						const response = await fetch('/api/albums?parentId=root');
						if (response.ok) {
							const result = await response.json();
							logger.debug('[AlbumGallery] Root albums response:', result);
							if (Array.isArray(result)) {
								albums = result;
								logger.debug(`[AlbumGallery] Loaded ${result.length} root albums (direct array)`);
							} else if (result.success && Array.isArray(result.data)) {
								albums = result.data;
								logger.debug(`[AlbumGallery] Loaded ${result.data.length} root albums (from result.data)`);
							} else if (result.data && Array.isArray(result.data)) {
								albums = result.data;
								logger.debug(`[AlbumGallery] Loaded ${result.data.length} root albums (from result.data fallback)`);
							} else {
								logger.warn('[AlbumGallery] Unexpected root albums response format:', result);
								albums = [];
							}
						} else {
							const errorText = await response.text();
							logger.error(`[AlbumGallery] Failed to fetch root albums: ${response.status} ${response.statusText}`, errorText);
							albums = [];
						}
					} catch (err) {
						logger.error('[AlbumGallery] Error fetching root albums:', err);
						albums = [];
					}
				} else {
					// For 'featured' or other cases, fetch hierarchy and flatten recursively
					const response = await fetch('/api/albums/hierarchy?includePrivate=false');
					if (response.ok) {
						const result = await response.json();
						const albumsData = result.success ? result.data : (result.data || result);
						if (Array.isArray(albumsData)) {
							// Flatten recursively
							const flattenAlbums = (items: any[]): any[] => {
								let resultList: any[] = [];
								for (const album of items) {
									if (album.isPublic || album.isFeatured) {
										resultList.push(album);
									}
									if (album.children && album.children.length > 0) {
										resultList = resultList.concat(flattenAlbums(album.children));
									}
								}
								return resultList;
							};
							albums = flattenAlbums(albumsData);
							if (albumSource === 'featured') {
								albums = albums.filter((a) => a.isFeatured);
							}
						}
					}
				}

				if (albums.length > 0) {
					await fetchCoverImages();
				}
			}
		} catch (err) {
			logger.error('Failed to load albums:', err);
			albums = [];
		} finally {
			loading = false;
		}
	}

	async function fetchCoverImages() {
		if (albums.length === 0) return;

		try {
			const response = await fetch('/api/albums/cover-images', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ albumIds: albums.filter((a) => a.cardType !== 'photo').map((a) => a._id) }),
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success && result.data) {
					coverImages = result.data;
				} else if (result && typeof result === 'object' && !result.success) {
					coverImages = result;
				} else {
					coverImages = {};
				}
			}
		} catch (err) {
			logger.error('Failed to fetch cover images:', err);
			coverImages = {};
		}
	}
</script>

<section class="@container py-12 @sm:py-16 @md:py-20 bg-[color:var(--tp-surface-2)] overflow-x-hidden min-w-0">
	<div class="w-full max-w-7xl mx-auto px-4 @sm:px-6 @lg:px-8 min-w-0">
		{#if titleText || descriptionHTML}
			<div class="text-center mb-10 @sm:mb-14 @md:mb-16 px-1">
				{#if titleText}
					<h2 class="text-2xl @sm:text-3xl @md:text-4xl font-bold text-[color:var(--tp-fg)] mb-3 @sm:mb-4 break-words">
						{titleText}
					</h2>
				{/if}
				{#if descriptionHTML}
					<div
						class="text-base @sm:text-lg text-[color:var(--tp-fg-muted)] prose prose-sm @sm:prose-lg max-w-3xl mx-auto [&_a]:text-[color:var(--os-primary)]"
					>
						{@html descriptionHTML}
					</div>
				{/if}
			</div>
		{/if}

		{#if loading}
			<div class="text-center py-12">
				<div
					class="inline-block animate-spin rounded-full h-12 w-12 border-2 border-[color:var(--tp-border)] border-t-[color:var(--os-primary)]"
				></div>
				<p class="mt-4 text-[color:var(--tp-fg-muted)]">Loading galleries...</p>
			</div>
		{:else if sortedAlbums.length > 0}
			{#if albumSource === 'current' && currentAlbum}
				<div class="max-w-6xl mx-auto mb-8 @sm:mb-10 min-w-0">
					<div
						class="bg-[color:var(--tp-surface-1)] rounded-xl border border-[color:var(--tp-border)] p-4 @sm:p-6 min-w-0"
					>
						{#each albumHeaderFieldOrder as field (field)}
							{#if field === 'albumTitle' && showAlbumPageTitle}
								{#if currentAlbumTitleText}
									<h1 class="text-2xl @sm:text-3xl @md:text-4xl font-bold text-[color:var(--tp-fg)] mb-3 break-words">
										{currentAlbumTitleText}
									</h1>
								{/if}
							{:else if field === 'albumDescription' && showAlbumPageDescription}
								{#if currentAlbumDescriptionHTML}
									<div class="prose prose-lg max-w-none text-[color:var(--tp-fg-muted)] mb-3 [&_a]:text-[color:var(--os-primary)]">
										{@html currentAlbumDescriptionHTML}
									</div>
								{/if}
							{:else if field === 'albumStats' && showAlbumPageStats}
								<div class="text-sm text-[color:var(--tp-fg-muted)]">
									{#if currentAlbumPhotoCount > 0}
										<span>{currentAlbumPhotoCount} {currentAlbumPhotoCount === 1 ? 'photo' : 'photos'}</span>
									{/if}
									{#if currentAlbumSubAlbumCount > 0}
										{#if currentAlbumPhotoCount > 0}<span class="mx-2">•</span>{/if}
										<span>{currentAlbumSubAlbumCount} {currentAlbumSubAlbumCount === 1 ? 'sub-album' : 'sub-albums'}</span>
									{/if}
								</div>
							{/if}
						{/each}
					</div>
				</div>
			{/if}

			{#if cardDataType === 'both' && mixedDisplayMode === 'grouped'}
				{#if albumItems.length > 0}
					{#if showSectionLabels}
						<h3 class="text-lg @sm:text-xl font-semibold text-[color:var(--tp-fg)] mb-3 @sm:mb-4">
							Sub-albums
						</h3>
					{/if}
					<div
						class="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 gap-5 @md:gap-6 mb-8 min-w-0"
					>
						{#each albumItems as album}
							<AlbumCard
								album={album}
								href={`/albums/${album.alias ?? ''}`}
								coverUrl={coverImages[album._id ?? ''] || ''}
								{coverAspectClass}
								cardFieldOrder={albumCardFieldOrder}
								showTitle={showAlbumTitle}
								{showCover}
								showDescription={showAlbumDescription}
								{descriptionLines}
								{showPhotoCount}
								showFeaturedBadge={showAlbumFeaturedBadge}
							/>
						{/each}
					</div>
				{/if}
				{#if photoItems.length > 0}
					{#if showSectionLabels}
						<h3 class="text-lg @sm:text-xl font-semibold text-[color:var(--tp-fg)] mb-3 @sm:mb-4">
							Photos
						</h3>
					{/if}
					<div
						class="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 gap-5 @md:gap-6 mb-8 min-w-0"
					>
						{#each photoItems as album}
							<PhotoCard
								photo={album}
								{coverAspectClass}
								cardFieldOrder={photoCardFieldOrder}
								showTitle={showPhotoTitle}
								{showCover}
								showDescription={showPhotoDescription}
								{descriptionLines}
								showFeaturedBadge={showPhotoFeaturedBadge}
								on:open={() => {
									const idx = album?._id != null ? lightboxIndexById.get(String(album._id)) : undefined;
									lightboxIndex = typeof idx === 'number' ? idx : 0;
									lightboxOpen = true;
								}}
							/>
						{/each}
					</div>
				{/if}
			{:else}
				<div class="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 gap-5 @md:gap-6 mb-8 min-w-0">
					{#each sortedAlbums as album}
						{#if album.cardType === 'photo'}
							<PhotoCard
								photo={album}
								{coverAspectClass}
								cardFieldOrder={photoCardFieldOrder}
								showTitle={showPhotoTitle}
								{showCover}
								showDescription={showPhotoDescription}
								{descriptionLines}
								showFeaturedBadge={showPhotoFeaturedBadge}
								on:open={() => {
									const idx = album?._id != null ? lightboxIndexById.get(String(album._id)) : undefined;
									lightboxIndex = typeof idx === 'number' ? idx : 0;
									lightboxOpen = true;
								}}
							/>
						{:else}
							<AlbumCard
								album={album}
								href={`/albums/${album.alias ?? ''}`}
								coverUrl={coverImages[album._id ?? ''] || ''}
								{coverAspectClass}
								cardFieldOrder={albumCardFieldOrder}
								showTitle={showAlbumTitle}
								{showCover}
								showDescription={showAlbumDescription}
								{descriptionLines}
								{showPhotoCount}
								showFeaturedBadge={showAlbumFeaturedBadge}
							/>
						{/if}
					{/each}
				</div>
			{/if}
		{:else}
			<div
				class="text-center py-10 @sm:py-12 px-4 bg-[color:var(--tp-surface-1)] rounded-xl border border-[color:var(--tp-border)] mx-auto max-w-lg"
			>
				<p class="text-[color:var(--tp-fg-muted)] text-sm @sm:text-base">No public albums available at the moment.</p>
				<a
					href="/albums"
					class="inline-flex items-center justify-center mt-4 px-5 @sm:px-6 py-2.5 @sm:py-3 text-sm @sm:text-base bg-[color:var(--os-primary)] text-[color:var(--tp-on-brand)] rounded-lg hover:opacity-90 transition-opacity font-medium w-full @sm:w-auto max-w-xs"
				>
					Browse Albums
				</a>
			</div>
		{/if}
	</div>
</section>

{#if lightboxOpen && lightboxPhotos.length > 0}
	<PhotoLightbox
		photos={lightboxPhotos}
		startIndex={lightboxIndex}
		isOpen={lightboxOpen}
		onClose={() => (lightboxOpen = false)}
		autoPlay={false}
		intervalMs={4000}
	/>
{/if}
