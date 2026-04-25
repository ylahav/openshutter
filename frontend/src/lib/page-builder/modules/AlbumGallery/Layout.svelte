<!-- frontend/src/lib/page-builder/modules/AlbumGallery/Layout.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { currentLanguage } from '$stores/language';
	import { siteConfigData } from '$stores/siteConfig';
	import { activeTemplate } from '$stores/template';
	import { normalizeTemplatePackId, type TemplatePackId } from '$lib/template/packs/ids';
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
		showAlbumHero?: boolean;
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
		/** `row`: cover left, text right; full-width list (album cards only). */
		albumCardLayout?: 'stack' | 'row';
		showSectionLabels?: boolean;
		/** When false, hides "Sub-albums" / "Photos" labels above grids. Takes precedence over `showSectionLabels` when set. */
		showHeading?: boolean;
		/** Set by AlbumsGrid layout only — Noir card chrome and listing defaults apply when pack is noir. */
		albumsGridVariant?: boolean;
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

	$: albumGridPack = normalizeTemplatePackId(
		$activeTemplate ??
			$siteConfigData?.template?.frontendTemplate ??
			$siteConfigData?.template?.activeTemplate
	) as TemplatePackId;
	$: isNoirPack = albumGridPack === 'noir';
	$: noirAlbumGrid = isNoirPack && config?.albumsGridVariant === true;

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
	$: showAlbumHero = config?.showAlbumHero === true;
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
	$: coverAspect =
		config?.coverAspect === 'square' || config?.coverAspect === 'portrait' || config?.coverAspect === 'video'
			? config.coverAspect
			: noirAlbumGrid
				? 'square'
				: 'video';
	$: showDescription = noirAlbumGrid ? config?.showDescription === true : config?.showDescription !== false;
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
	$: showGridSectionHeadings = noirAlbumGrid
		? config?.showHeading === true
		: config?.showHeading === false
			? false
			: config?.showHeading === true
				? true
				: config?.showSectionLabels !== false;
	$: albumCardLayout = (config?.albumCardLayout === 'row' ? 'row' : 'stack') as 'stack' | 'row';
	$: albumCardsListClass =
		albumCardLayout === 'row'
			? 'pb-albumGallery__list pb-albumGallery__list--row'
			: 'pb-albumGallery__list pb-albumGallery__list--grid';
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

	$: coverAspectClass =
		coverAspect === 'square'
			? 'pb-albumGallery__aspect pb-albumGallery__aspect--square'
			: coverAspect === 'portrait'
				? 'pb-albumGallery__aspect pb-albumGallery__aspect--portrait'
				: 'pb-albumGallery__aspect pb-albumGallery__aspect--video';
	$: albumItems = sortedAlbums.filter((item) => item.cardType !== 'photo');
	$: photoItems = sortedAlbums.filter((item) => item.cardType === 'photo');
	// Get album alias from page context (URL parameter), with URL fallback.
	$: currentAlbumAlias = (() => {
		const fromData =
			(typeof data?.params?.albumAlias === 'string' && data.params.albumAlias.trim()) ||
			(typeof data?.params?.alias === 'string' && data.params.alias.trim()) ||
			(typeof data?.albumAlias === 'string' && data.albumAlias.trim()) ||
			(typeof data?.alias === 'string' && data.alias.trim()) ||
			(typeof data?.routeParams?.albumAlias === 'string' && data.routeParams.albumAlias.trim()) ||
			'';
		if (fromData) return fromData;
		if (browser && typeof window !== 'undefined') {
			const path = window.location.pathname || '';
			const match = path.match(/^\/albums\/([^/?#]+)/);
			if (match?.[1]) return decodeURIComponent(match[1]);
		}
		return null;
	})();

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
	$: currentAlbumDescriptionText = stripHtml(currentAlbumDescriptionHTML);
	$: currentAlbumLeadingPhotoUrl = getCurrentAlbumLeadingPhotoUrl(
		currentAlbum,
		albums
	);
	$: currentAlbumHeroImage =
		currentAlbumLeadingPhotoUrl ||
		getCurrentAlbumCoverImage(currentAlbum) ||
		(coverImages[currentAlbum?._id ?? ''] || '');
	$: currentAlbumPhotoCount = Number(currentAlbum?.photoCount) || 0;
	// Prefer sub-albums count from the fetched payload (we store it on `currentAlbum` when available).
	$: currentAlbumSubAlbumCount = Number((currentAlbum as any)?.childAlbumCount) || 0;

	let lightboxOpen = false;
	let lightboxIndex = 0;

	function stripHtml(value: string): string {
		return String(value ?? '')
			.replace(/<[^>]*>/g, ' ')
			.replace(/&nbsp;/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	function getCurrentAlbumCoverImage(album: any): string {
		if (!album || typeof album !== 'object') return '';
		return (
			album.coverUrl ||
			album.coverImage ||
			album.coverImageUrl ||
			album.thumbnailUrl ||
			album.previewUrl ||
			album.imageUrl ||
			''
		);
	}

	function getCurrentAlbumLeadingPhotoUrl(
		album: any,
		items: AlbumCard[]
	): string {
		if (!album || typeof album !== 'object') return '';
		const photos = (Array.isArray(items) ? items : []).filter(
			(item) => item.cardType === 'photo'
		) as any[];
		if (photos.length === 0) return '';

		const coverPhotoId = String(album?.coverPhotoId ?? '').trim();
		const byCoverId = coverPhotoId
			? photos.find((p) => String(p?._id ?? '') === coverPhotoId)
			: undefined;
		const leading = byCoverId ?? photos.find((p) => p?.isLeading === true);
		if (!leading) return '';
		return getPhotoFullUrl(leading) || leading.coverUrl || '';
	}

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

<section class="pb-albumGallery">
	<div class="pb-albumGallery__container">
		{#if titleText || descriptionHTML}
			<div class="pb-albumGallery__intro">
				{#if titleText}
					<h2 class="pb-albumGallery__title">
						{titleText}
					</h2>
				{/if}
				{#if descriptionHTML}
					<div class="pb-albumGallery__description">
						{@html descriptionHTML}
					</div>
				{/if}
			</div>
		{/if}

		{#if loading}
			<div class="pb-albumGallery__loading">
				<div class="pb-albumGallery__spinner" role="status" aria-label="Loading"></div>
				<p class="pb-albumGallery__loadingText">Loading galleries...</p>
			</div>
		{:else}
			{#if albumSource === 'current' && currentAlbum}
				{#if showAlbumHero}
					<div class="alb-hero pb-albumGallery__hero">
						{#if currentAlbumHeroImage}
							<img class="alb-hero-img" src={currentAlbumHeroImage} alt={currentAlbumTitleText || 'Album cover'} />
						{/if}
						<div class="alb-ov"></div>
						<div class="alb-content">
							<a class="alb-back" href="/albums">← albums</a>
							<h1 class="alb-title">{currentAlbumTitleText}</h1>
							{#if currentAlbumDescriptionText}
								<p class="alb-desc">{currentAlbumDescriptionText}</p>
							{/if}
						</div>
					</div>
				{/if}
				{#if !showAlbumHero}
					<div class="pb-albumGallery__pageHeaderWrap">
						<div class="pb-albumGallery__pageHeaderCard">
							{#each albumHeaderFieldOrder as field (field)}
								{#if field === 'albumTitle' && showAlbumPageTitle}
									{#if currentAlbumTitleText}
										<h1 class="pb-albumGallery__pageTitle">
											{currentAlbumTitleText}
										</h1>
									{/if}
								{:else if field === 'albumDescription' && showAlbumPageDescription}
									{#if currentAlbumDescriptionHTML}
										<div class="pb-albumGallery__pageDescription">
											{@html currentAlbumDescriptionHTML}
										</div>
									{/if}
								{:else if field === 'albumStats' && showAlbumPageStats}
									<div class="pb-albumGallery__stats">
										{#if currentAlbumPhotoCount > 0}
											<span>{currentAlbumPhotoCount} {currentAlbumPhotoCount === 1 ? 'photo' : 'photos'}</span>
										{/if}
										{#if currentAlbumSubAlbumCount > 0}
											{#if currentAlbumPhotoCount > 0}<span class="pb-albumGallery__statsSep">•</span>{/if}
											<span>{currentAlbumSubAlbumCount} {currentAlbumSubAlbumCount === 1 ? 'sub-album' : 'sub-albums'}</span>
										{/if}
									</div>
								{/if}
							{/each}
						</div>
					</div>
				{/if}
			{/if}

			{#if sortedAlbums.length > 0}
				{#if cardDataType === 'both' && mixedDisplayMode === 'grouped'}
					{#if albumItems.length > 0}
						{#if showGridSectionHeadings}
							<h3 class="pb-albumGallery__sectionTitle">
								Sub-albums
							</h3>
						{/if}
						<div class={albumCardsListClass}>
							{#each albumItems as album}
								<AlbumCard
									album={album}
									href={`/albums/${album.alias ?? ''}`}
									coverUrl={coverImages[album._id ?? ''] || ''}
									{coverAspectClass}
									layout={albumCardLayout}
									cardFieldOrder={albumCardFieldOrder}
									showTitle={showAlbumTitle}
									{showCover}
									showDescription={showAlbumDescription}
									{descriptionLines}
									{showPhotoCount}
									showFeaturedBadge={showAlbumFeaturedBadge}
									noirStackCard={noirAlbumGrid && albumCardLayout === 'stack'}
								/>
							{/each}
						</div>
					{/if}
					{#if photoItems.length > 0}
						{#if showGridSectionHeadings}
							<h3 class="pb-albumGallery__sectionTitle">
								Photos
							</h3>
						{/if}
						<div class="pb-albumGallery__list pb-albumGallery__list--photos">
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
					<div class={albumCardsListClass}>
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
									layout={albumCardLayout}
									cardFieldOrder={albumCardFieldOrder}
									showTitle={showAlbumTitle}
									{showCover}
									showDescription={showAlbumDescription}
									{descriptionLines}
									{showPhotoCount}
									showFeaturedBadge={showAlbumFeaturedBadge}
									noirStackCard={noirAlbumGrid && albumCardLayout === 'stack'}
								/>
							{/if}
						{/each}
					</div>
				{/if}
			{:else}
				<div class="pb-albumGallery__empty">
					<p class="pb-albumGallery__emptyText">No public albums available at the moment.</p>
					<a href="/albums" class="pb-albumGallery__emptyCta">
						Browse Albums
					</a>
				</div>
			{/if}
		{/if}
	</div>
</section>

<style lang="scss">
	/* Aspect tokens passed into AlbumCard / PhotoCard (children); must be global */
	:global(.pb-albumGallery__aspect--square) {
		aspect-ratio: 1 / 1;
	}
	:global(.pb-albumGallery__aspect--portrait) {
		aspect-ratio: 3 / 4;
	}
	:global(.pb-albumGallery__aspect--video) {
		aspect-ratio: 16 / 9;
	}

	.pb-albumGallery {
		container-type: inline-size;
		min-width: 0;
		overflow-x: hidden;
		background: var(--tp-surface-2);
		padding-block: 3rem;
	}

	@media (min-width: 640px) {
		.pb-albumGallery {
			padding-block: 4rem;
		}
	}

	@media (min-width: 768px) {
		.pb-albumGallery {
			padding-block: 5rem;
		}
	}

	.pb-albumGallery__container {
		width: 100%;
		max-width: 80rem;
		margin: 0 auto;
		padding-inline: 1rem;
		min-width: 0;
	}

	@media (min-width: 640px) {
		.pb-albumGallery__container {
			padding-inline: 1.5rem;
		}
	}

	@media (min-width: 1024px) {
		.pb-albumGallery__container {
			padding-inline: 2rem;
		}
	}

	.pb-albumGallery__intro {
		text-align: center;
		margin-bottom: 2.5rem;
		padding-inline: 0.25rem;
	}

	@media (min-width: 640px) {
		.pb-albumGallery__intro {
			margin-bottom: 3.5rem;
		}
	}

	@media (min-width: 768px) {
		.pb-albumGallery__intro {
			margin-bottom: 4rem;
		}
	}

	.pb-albumGallery__title {
		margin: 0 0 0.75rem;
		font-size: clamp(1.5rem, 3vw, 2.25rem);
		font-weight: 700;
		color: var(--tp-fg);
		overflow-wrap: anywhere;
	}

	@media (min-width: 640px) {
		.pb-albumGallery__title {
			margin-bottom: 1rem;
			font-size: clamp(1.75rem, 3.5vw, 2.25rem);
		}
	}

	.pb-albumGallery__description {
		margin: 0 auto;
		max-width: 48rem;
		font-size: 1rem;
		line-height: 1.65;
		color: var(--tp-fg-muted);
	}

	@media (min-width: 640px) {
		.pb-albumGallery__description {
			font-size: 1.125rem;
		}
	}

	.pb-albumGallery__description :global(a) {
		color: var(--os-primary);
	}

	.pb-albumGallery__loading {
		text-align: center;
		padding-block: 3rem;
	}

	.pb-albumGallery__spinner {
		display: inline-block;
		width: 3rem;
		height: 3rem;
		border: 2px solid var(--tp-border);
		border-top-color: var(--os-primary);
		border-radius: 999px;
		animation: pb-albumGallery-spin 0.8s linear infinite;
	}

	.pb-albumGallery__loadingText {
		margin-top: 1rem;
		color: var(--tp-fg-muted);
	}

	@keyframes pb-albumGallery-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.pb-albumGallery__hero {
		margin-bottom: 2rem;
	}

	@media (min-width: 640px) {
		.pb-albumGallery__hero {
			margin-bottom: 2.5rem;
		}
	}

	.pb-albumGallery__pageHeaderWrap {
		max-width: 72rem;
		margin: 0 auto 2rem;
		min-width: 0;
	}

	@media (min-width: 640px) {
		.pb-albumGallery__pageHeaderWrap {
			margin-bottom: 2.5rem;
		}
	}

	.pb-albumGallery__pageHeaderCard {
		background: var(--tp-surface-1);
		border: 1px solid var(--tp-border);
		border-radius: 0.75rem;
		padding: 1rem;
		min-width: 0;
	}

	@media (min-width: 640px) {
		.pb-albumGallery__pageHeaderCard {
			padding: 1.5rem;
		}
	}

	.pb-albumGallery__pageTitle {
		margin: 0 0 0.75rem;
		font-size: clamp(1.5rem, 3vw, 2.25rem);
		font-weight: 700;
		color: var(--tp-fg);
		overflow-wrap: anywhere;
	}

	.pb-albumGallery__pageDescription {
		margin: 0 0 0.75rem;
		color: var(--tp-fg-muted);
		font-size: 1.125rem;
		line-height: 1.6;
	}

	.pb-albumGallery__pageDescription :global(a) {
		color: var(--os-primary);
	}

	.pb-albumGallery__stats {
		font-size: 0.875rem;
		color: var(--tp-fg-muted);
	}

	.pb-albumGallery__statsSep {
		margin-inline: 0.5rem;
	}

	.pb-albumGallery__sectionTitle {
		margin: 0 0 0.75rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--tp-fg);
	}

	@media (min-width: 640px) {
		.pb-albumGallery__sectionTitle {
			margin-bottom: 1rem;
			font-size: 1.25rem;
		}
	}

	.pb-albumGallery__list {
		min-width: 0;
		margin-bottom: 2rem;
	}

	.pb-albumGallery__list--row {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.pb-albumGallery__list--row {
			gap: 1.25rem;
		}
	}

	.pb-albumGallery__list--grid,
	.pb-albumGallery__list--photos {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.25rem;
	}

	@media (min-width: 768px) {
		.pb-albumGallery__list--grid,
		.pb-albumGallery__list--photos {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 1.5rem;
		}
	}

	@media (min-width: 1280px) {
		.pb-albumGallery__list--grid,
		.pb-albumGallery__list--photos {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	.pb-albumGallery__empty {
		text-align: center;
		padding: 2.5rem 1rem;
		margin: 0 auto;
		max-width: 32rem;
		background: var(--tp-surface-1);
		border: 1px solid var(--tp-border);
		border-radius: 0.75rem;
	}

	@media (min-width: 640px) {
		.pb-albumGallery__empty {
			padding-block: 3rem;
		}
	}

	.pb-albumGallery__emptyText {
		margin: 0;
		color: var(--tp-fg-muted);
		font-size: 0.875rem;
	}

	@media (min-width: 640px) {
		.pb-albumGallery__emptyText {
			font-size: 1rem;
		}
	}

	.pb-albumGallery__emptyCta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-top: 1rem;
		padding: 0.625rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		width: 100%;
		max-width: 20rem;
		border-radius: 0.5rem;
		background: var(--os-primary);
		color: var(--tp-on-brand);
		text-decoration: none;
		transition: opacity 0.2s ease;
	}

	.pb-albumGallery__emptyCta:hover {
		opacity: 0.9;
	}

	@media (min-width: 640px) {
		.pb-albumGallery__emptyCta {
			width: auto;
			padding: 0.75rem 1.5rem;
			font-size: 1rem;
		}
	}
</style>

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
