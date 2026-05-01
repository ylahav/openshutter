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
	import JustifiedPhotoGrid from './JustifiedPhotoGrid.svelte';
	import {
		photoCardPresentation,
		resolveAlbumCardVariant,
		resolvePhotoGridVariant,
	} from './card-layout';
	import './_styles.scss';

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
		/** Theme-style album preset (spec: bare, cards, list, …). */
		albumCard?: string;
		/** Explicit album card visual preset; see `card-layout.ts`. */
		albumCardVariant?: string;
		/** Theme-style photo grid preset (spec: square-tight, landscape, …). */
		photoCard?: string;
		/** Photo grid preset when showing photos; see `card-layout.ts`. */
		photoGridVariant?: string;
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
	/** AlbumsGrid sets `albumsGridVariant`; hide "Sub-albums" / "Photos" row titles unless `showHeading` is explicitly true (same for all packs). */
	$: showGridSectionHeadings =
		config?.albumsGridVariant === true
			? config?.showHeading === true
			: config?.showHeading === false
				? false
				: config?.showHeading === true
					? true
					: config?.showSectionLabels !== false;
	$: albumCardLayout = (config?.albumCardLayout === 'row' ? 'row' : 'stack') as 'stack' | 'row';
	$: themeAlbumCard = $siteConfigData?.template?.albumCard;
	$: themePhotoCard = $siteConfigData?.template?.photoCard;
	$: moduleAlbumCard = config?.albumCard ?? config?.albumCardVariant;
	$: modulePhotoCard = config?.photoCard ?? config?.photoGridVariant;
	$: albumCardVisual = resolveAlbumCardVariant(
		moduleAlbumCard,
		themeAlbumCard,
		albumGridPack,
		noirAlbumGrid,
		albumCardLayout
	);
	$: photoGridVisual = resolvePhotoGridVariant(modulePhotoCard, themePhotoCard, albumGridPack);
	$: photoGridForLayout =
		mixedDisplayMode === 'interleaved' &&
		(photoGridVisual === 'largePreview' || photoGridVisual === 'justifiedRows')
			? 'default'
			: photoGridVisual;
	$: photoCardPres = photoCardPresentation(photoGridForLayout);

	$: albumListBaseClass = (() => {
		if (albumCardVisual === 'compactList') {
			return 'pb-albumGallery__list pb-albumGallery__list--compactAlbums';
		}
		if (albumCardLayout === 'row' || albumCardVisual === 'editorialList') {
			return 'pb-albumGallery__list pb-albumGallery__list--row';
		}
		const portraitExtra = albumCardVisual === 'portraitGrid' ? ' pb-albumGallery__list--portraitAlbums' : '';
		return `pb-albumGallery__list pb-albumGallery__list--grid${portraitExtra}`;
	})();

	$: photosGridModifierClass = (() => {
		const v = photoGridForLayout;
		if (v === 'squareTight') return 'pb-albumGallery__list--photosSquareTight';
		if (v === 'landscape43') return 'pb-albumGallery__list--photosLandscape43';
		if (v === 'portrait34') return 'pb-albumGallery__list--photosPortrait34';
		if (v === 'masonry') return 'pb-albumGallery__list--photosMasonry';
		return '';
	})();

	$: groupedPhotosListClass = ['pb-albumGallery__list', 'pb-albumGallery__list--photos', photosGridModifierClass]
		.filter(Boolean)
		.join(' ');
	$: interleavedListClass = [albumListBaseClass, photosGridModifierClass].filter(Boolean).join(' ');

	$: albumGallerySectionClass = [
		'pb-albumGallery',
		noirAlbumGrid ? 'pb-albumGallery--noirGrid' : '',
		albumCardVisual === 'bareSquare' && !noirAlbumGrid ? 'pb-albumGallery--bareSquareAlbums' : '',
	]
		.filter(Boolean)
		.join(' ');

	$: largePreviewHeroAspectClass = 'pb-albumGallery__aspect pb-albumGallery__aspect--video';

	$: sortBy = (
		config?.sortBy === 'order' ||
		config?.sortBy === 'name' ||
		config?.sortBy === 'photoCount' ||
		config?.sortBy === 'createdAt' ||
		config?.sortBy === 'lastPhotoDate'
	) ? config.sortBy : 'manual';
	$: sortDirection = config?.sortDirection === 'desc' ? 'desc' : 'asc';
	/** Cap for root/featured/selected grids only; album detail (`current`) shows all loaded photos + load more. */
	$: maxItems = Math.min(500, Math.max(1, Number(config?.limit) || 12));
	$: albumListSliceCap = albumSource === 'current' ? Number.POSITIVE_INFINITY : maxItems;

	$: sortedAlbums = (() => {
		const list: AlbumCard[] = Array.isArray(albums) ? [...albums] : [];
		const cap = albumListSliceCap;
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
			return withIndex.map((x) => x.item).slice(0, cap);
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
		return list.slice(0, cap);
	})();

	$: coverAspectClass =
		coverAspect === 'square'
			? 'pb-albumGallery__aspect pb-albumGallery__aspect--square'
			: coverAspect === 'portrait'
				? 'pb-albumGallery__aspect pb-albumGallery__aspect--portrait'
				: 'pb-albumGallery__aspect pb-albumGallery__aspect--video';

	$: albumCardCoverAspectClass =
		albumCardVisual === 'portraitGrid'
			? 'pb-albumGallery__aspect pb-albumGallery__aspect--portrait'
			: albumCardVisual === 'permanentOverlay'
				? 'pb-albumGallery__aspect pb-albumGallery__aspect--square'
				: albumCardVisual === 'roundedCard' || albumCardVisual === 'editorialList'
					? 'pb-albumGallery__aspect pb-albumGallery__aspect--landscape43'
					: coverAspectClass;

	$: photoCoverAspectClass =
		photoGridForLayout === 'landscape43'
			? 'pb-albumGallery__aspect pb-albumGallery__aspect--landscape43'
			: photoGridForLayout === 'portrait34'
				? 'pb-albumGallery__aspect pb-albumGallery__aspect--portrait'
				: photoGridForLayout === 'squareTight' || photoGridForLayout === 'justifiedRows'
					? 'pb-albumGallery__aspect pb-albumGallery__aspect--square'
					: coverAspectClass;

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

	const PHOTO_PAGE_SIZE = 100;

	let albums: AlbumCard[] = [];
	let loading = true;
	/** Photo pagination for `albumSource === 'current'` (API returns paginated photos). */
	let currentAlbumPagination: { page: number; limit: number; total: number; pages: number } | null = null;
	let loadingMorePhotos = false;
	/** Template / parent-provided list error (skips internal fetch). */
	let listError: string | null = null;
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
	$: loadedPhotoCount = sortedAlbums.filter((a) => a.cardType === 'photo').length;
	$: showAlbumLoadMore =
		albumSource === 'current' &&
		currentAlbumPagination != null &&
		currentAlbumPagination.page < currentAlbumPagination.pages;
	// Prefer sub-albums count from the fetched payload (we store it on `currentAlbum` when available).
	$: currentAlbumSubAlbumCount = Number((currentAlbum as any)?.childAlbumCount) || 0;

	let lightboxOpen = false;
	let lightboxIndex = 0;

	function albumEditorialIndex(list: AlbumCard[], index: number): number {
		let n = 0;
		for (let j = 0; j < index; j++) {
			if (list[j]?.cardType !== 'photo') n++;
		}
		return n + 1;
	}

	function openLightboxForPhoto(album: AlbumCard) {
		const idx = album?._id != null ? lightboxIndexById.get(String(album._id)) : undefined;
		lightboxIndex = typeof idx === 'number' ? idx : 0;
		lightboxOpen = true;
	}

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
	let lastInjectedAlbumsSig = '';
	$: injectedAlbumsSig = (() => {
		const d = data as { albums?: unknown; albumListLoading?: boolean; albumListError?: string | null } | null | undefined;
		if (d != null && Array.isArray(d.albums)) {
			const ids = (d.albums as { _id?: string }[]).map((a) => a?._id ?? '');
			return `inj:${JSON.stringify(ids)}:${d.albumListLoading === true}:${d.albumListError ?? ''}`;
		}
		return 'no-inj';
	})();
	$: if (browser && (
		JSON.stringify(effectiveSelectedAlbums) !== JSON.stringify(lastSelectedAlbums) || 
		albumSource !== lastAlbumSource ||
		(albumSource === 'current' && currentAlbumKey !== lastAlbumSource) ||
		injectedAlbumsSig !== lastInjectedAlbumsSig
	)) {
		lastSelectedAlbums = [...effectiveSelectedAlbums];
		lastAlbumSource = albumSource === 'current' ? currentAlbumKey : albumSource;
		lastInjectedAlbumsSig = injectedAlbumsSig;
		loadAlbums();
	}

	onMount(async () => {
		await loadAlbums();
	});

	async function loadAlbums() {
		const d = data as {
			albums?: unknown;
			albumListLoading?: boolean;
			albumListError?: string | null;
		} | null | undefined;
		if (
			d != null &&
			Array.isArray(d.albums) &&
			albumSource !== 'current' &&
			albumSource !== 'selected'
		) {
			listError = typeof d.albumListError === 'string' && d.albumListError.trim() ? d.albumListError : null;
			if (listError) {
				albums = [];
				loading = false;
				currentAlbum = null;
				return;
			}
			loading = d.albumListLoading === true;
			if (loading) {
				albums = [];
				currentAlbum = null;
				return;
			}
			albums = d.albums as AlbumCard[];
			currentAlbum = null;
			if (albums.some((item) => item.cardType !== 'photo')) {
				await fetchCoverImages();
			}
			loading = false;
			return;
		}

		listError = null;
		loading = true;
		currentAlbumPagination = null;
		try {
			if (albumSource === 'current' && currentAlbumAlias) {
				// Fetch the current album from URL alias
				try {
					const response = await fetch(
						`/api/albums/${encodeURIComponent(currentAlbumAlias)}/data?page=1&limit=${PHOTO_PAGE_SIZE}&t=${Date.now()}`,
						{
							credentials: 'include',
						}
					);
					if (response.ok) {
						const result = await response.json();
						const albumData = result.success ? result.data : result;
						if (albumData?.album) {
							currentAlbumPagination =
								albumData.pagination && typeof albumData.pagination.pages === 'number'
									? albumData.pagination
									: null;
							// Keep a stable "current album" object for header rendering.
							currentAlbum = { ...albumData.album, childAlbumCount: Array.isArray(albumData.subAlbums) ? albumData.subAlbums.length : (albumData.album as any)?.childAlbumCount };
							const subAlbums = Array.isArray(albumData.subAlbums)
								? albumData.subAlbums.map((item: any) => ({ ...item, cardType: 'subAlbum' as const }))
								: [];
							const photos = Array.isArray(albumData.photos) ? mapFetchedPhotosToAlbumCards(albumData.photos) : [];
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
						currentAlbumPagination = null;
					}
				} catch (err) {
					logger.error(`Failed to fetch current album ${currentAlbumAlias}:`, err);
					albums = [];
					currentAlbum = null;
					currentAlbumPagination = null;
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

	function mapFetchedPhotosToAlbumCards(raw: any[]): AlbumCard[] {
		return raw.map((item: any) => ({
			...item,
			cardType: 'photo' as const,
			name: item?.title ?? item?.name ?? item?.filename ?? item?.originalName ?? 'Photo',
			description: item?.description,
			order: typeof item?.order === 'number' ? item.order : (typeof item?.photoOrder === 'number' ? item.photoOrder : undefined),
			coverUrl: item?.thumbnailUrl ?? item?.previewUrl ?? item?.url ?? item?.imageUrl ?? ''
		}));
	}

	async function loadMorePhotosForCurrentAlbum() {
		if (
			!currentAlbum?._id ||
			!currentAlbumPagination ||
			loadingMorePhotos ||
			currentAlbumPagination.page >= currentAlbumPagination.pages
		) {
			return;
		}
		const albumId = String(currentAlbum._id);
		const nextPage = currentAlbumPagination.page + 1;
		loadingMorePhotos = true;
		try {
			const res = await fetch(
				`/api/albums/${encodeURIComponent(albumId)}/data?page=${nextPage}&limit=${PHOTO_PAGE_SIZE}&t=${Date.now()}`,
				{ cache: 'no-store', credentials: 'include' }
			);
			if (!res.ok) return;
			const result = await res.json().catch(() => ({}));
			const albumData = result.success ? result.data : result;
			const newPhotosRaw = Array.isArray(albumData?.photos) ? albumData.photos : [];
			const newPhotoCards = mapFetchedPhotosToAlbumCards(newPhotosRaw);
			const existingIds = new Set(
				albums.filter((a) => a.cardType === 'photo').map((a) => String((a as any)._id ?? ''))
			);
			const mergedNew = newPhotoCards.filter((p) => p._id != null && !existingIds.has(String(p._id)));
			const subOnly = albums.filter((a) => a.cardType !== 'photo');
			const existingPhotos = albums.filter((a) => a.cardType === 'photo');
			albums = [...subOnly, ...existingPhotos, ...mergedNew];
			if (albumData?.pagination && typeof albumData.pagination.pages === 'number') {
				currentAlbumPagination = albumData.pagination;
			} else {
				currentAlbumPagination = { ...currentAlbumPagination, page: nextPage };
			}
		} catch (e) {
			logger.error('[AlbumGallery] load more photos failed:', e);
		} finally {
			loadingMorePhotos = false;
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

<section class={albumGallerySectionClass}>
	<div class="pb-albumGallery__container">
		{#if listError}
			<p class="pb-albumGallery__injectedError">{listError}</p>
		{/if}
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
						<div class={albumListBaseClass}>
							{#each albumItems as album, ai}
								<AlbumCard
									album={album}
									href={`/albums/${album.alias ?? ''}`}
									coverUrl={coverImages[album._id ?? ''] || ''}
									coverAspectClass={albumCardCoverAspectClass}
									layout={albumCardLayout}
									cardFieldOrder={albumCardFieldOrder}
									showTitle={showAlbumTitle}
									{showCover}
									showDescription={showAlbumDescription}
									{descriptionLines}
									{showPhotoCount}
									showFeaturedBadge={showAlbumFeaturedBadge}
									variant={albumCardVisual}
									editorialIndex={albumCardVisual === 'editorialList' ? ai + 1 : undefined}
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
						{#if photoGridForLayout === 'justifiedRows'}
							<div class="pb-albumGallery__photosJustified">
								<JustifiedPhotoGrid
									photos={photoItems}
									gapPx={4}
									targetRowHeight={220}
									on:open={(e) => openLightboxForPhoto(e.detail.photo)}
								/>
							</div>
						{:else if photoGridVisual === 'largePreview'}
							<div class="pb-albumGallery__largePreview">
								<div class="pb-albumGallery__largePreviewHero">
									<PhotoCard
										photo={photoItems[0]}
										coverAspectClass={largePreviewHeroAspectClass}
										cardFieldOrder={photoCardFieldOrder}
										showTitle={showPhotoTitle}
										{showCover}
										showDescription={showPhotoDescription}
										{descriptionLines}
										showFeaturedBadge={showPhotoFeaturedBadge}
										presentation="full"
										on:open={() => openLightboxForPhoto(photoItems[0])}
									/>
								</div>
								{#if photoItems.length > 1}
									<div
										class="pb-albumGallery__largePreviewRest pb-albumGallery__list pb-albumGallery__list--photos"
									>
										{#each photoItems.slice(1) as album}
											<PhotoCard
												photo={album}
												coverAspectClass={photoCoverAspectClass}
												cardFieldOrder={photoCardFieldOrder}
												showTitle={showPhotoTitle}
												{showCover}
												showDescription={showPhotoDescription}
												{descriptionLines}
												showFeaturedBadge={showPhotoFeaturedBadge}
												presentation={photoCardPres}
												on:open={() => openLightboxForPhoto(album)}
											/>
										{/each}
									</div>
								{/if}
							</div>
						{:else}
							<div class={groupedPhotosListClass}>
								{#each photoItems as album}
									<PhotoCard
										photo={album}
										coverAspectClass={photoCoverAspectClass}
										cardFieldOrder={photoCardFieldOrder}
										showTitle={showPhotoTitle}
										{showCover}
										showDescription={showPhotoDescription}
										{descriptionLines}
										showFeaturedBadge={showPhotoFeaturedBadge}
										presentation={photoCardPres}
										on:open={() => openLightboxForPhoto(album)}
									/>
								{/each}
							</div>
						{/if}
					{/if}
				{:else}
					<div class={interleavedListClass}>
						{#each sortedAlbums as album, si}
							{#if album.cardType === 'photo'}
								<PhotoCard
									photo={album}
									coverAspectClass={photoCoverAspectClass}
									cardFieldOrder={photoCardFieldOrder}
									showTitle={showPhotoTitle}
									{showCover}
									showDescription={showPhotoDescription}
									{descriptionLines}
									showFeaturedBadge={showPhotoFeaturedBadge}
									presentation={photoCardPres}
									on:open={() => openLightboxForPhoto(album)}
								/>
							{:else}
								<AlbumCard
									album={album}
									href={`/albums/${album.alias ?? ''}`}
									coverUrl={coverImages[album._id ?? ''] || ''}
									coverAspectClass={albumCardCoverAspectClass}
									layout={albumCardLayout}
									cardFieldOrder={albumCardFieldOrder}
									showTitle={showAlbumTitle}
									{showCover}
									showDescription={showAlbumDescription}
									{descriptionLines}
									{showPhotoCount}
									showFeaturedBadge={showAlbumFeaturedBadge}
									variant={albumCardVisual}
									editorialIndex={albumCardVisual === 'editorialList'
										? albumEditorialIndex(sortedAlbums, si)
										: undefined}
								/>
							{/if}
						{/each}
					</div>
				{/if}
				{#if showAlbumLoadMore}
					<div class="pb-albumGallery__loadMoreWrap">
						<button
							type="button"
							class="pb-albumGallery__loadMore"
							disabled={loadingMorePhotos}
							on:click={loadMorePhotosForCurrentAlbum}
						>
							{loadingMorePhotos
								? 'Loading…'
								: `Load more photos (${loadedPhotoCount} / ${currentAlbumPagination?.total ?? loadedPhotoCount})`}
						</button>
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
