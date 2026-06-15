<!-- frontend/src/lib/page-builder/modules/AlbumGalleryModule.svelte -->
<script lang="ts">
	import Layout from './AlbumGallery/Layout.svelte';

	type AlbumGalleryProps = {
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
		cardFieldOrder?: Array<'title' | 'cover' | 'description' | 'photoCount' | 'featuredBadge'>;
		albumCardFieldOrder?: Array<'title' | 'cover' | 'description' | 'photoCount' | 'featuredBadge'>;
		photoCardFieldOrder?: Array<'title' | 'cover' | 'description' | 'featuredBadge'>;
		albumCardLayout?: 'stack' | 'row';
		albumCard?: string;
		photoCard?: string;
		albumCardVariant?: string;
		photoGridVariant?: string;
		showPhotoCount?: boolean;
		showFeaturedBadge?: boolean;
		showAlbumFeaturedBadge?: boolean;
		showPhotoFeaturedBadge?: boolean;
		cardDataType?: 'subAlbums' | 'photos' | 'both';
		mixedDisplayMode?: 'grouped' | 'interleaved';
		showSectionLabels?: boolean;
		showHeading?: boolean;
		sortBy?: 'manual' | 'order' | 'name' | 'photoCount' | 'createdAt' | 'lastPhotoDate';
		sortDirection?: 'asc' | 'desc';
		limit?: number;
	};

	type LegacyAlbumGalleryProps = {
		config?: AlbumGalleryProps;
	} & AlbumGalleryProps;

	let {
		title = '',
		description = undefined,
		albumHeaderFieldOrder = ['albumTitle', 'albumDescription', 'albumStats'],
		showAlbumPageTitle = true,
		showAlbumPageDescription = true,
		showAlbumPageStats = true,
		showAlbumHero = false,
		albumSource = 'root',
		selectedAlbums = undefined,
		rootAlbumId = undefined,
		rootGallery = undefined,
		includeRoot = true,
		showTitle = true,
		showAlbumTitle = true,
		showPhotoTitle = true,
		showCover = true,
		coverAspect = 'video',
		showDescription = true,
		showAlbumDescription = true,
		showPhotoDescription = true,
		descriptionLines = 2,
		cardFieldOrder = ['cover', 'title', 'description', 'photoCount', 'featuredBadge'],
		albumCardFieldOrder = ['cover', 'title', 'description', 'photoCount', 'featuredBadge'],
		photoCardFieldOrder = ['cover', 'title', 'description', 'featuredBadge'],
		albumCardLayout = 'stack',
		albumCard = undefined,
		photoCard = undefined,
		albumCardVariant = undefined,
		photoGridVariant = undefined,
		showPhotoCount = true,
		showFeaturedBadge = true,
		showAlbumFeaturedBadge = true,
		showPhotoFeaturedBadge = true,
		cardDataType = 'both',
		mixedDisplayMode = 'grouped',
		showSectionLabels = true,
		showHeading = undefined,
		sortBy = 'manual',
		sortDirection = 'asc',
		limit = 12,
		className: _cellClass = undefined,
		props,
		data = null,
		...rest
	}: {
		title?: AlbumGalleryProps['title'];
		description?: AlbumGalleryProps['description'];
		albumHeaderFieldOrder?: AlbumGalleryProps['albumHeaderFieldOrder'];
		showAlbumPageTitle?: AlbumGalleryProps['showAlbumPageTitle'];
		showAlbumPageDescription?: AlbumGalleryProps['showAlbumPageDescription'];
		showAlbumPageStats?: AlbumGalleryProps['showAlbumPageStats'];
		showAlbumHero?: AlbumGalleryProps['showAlbumHero'];
		albumSource?: AlbumGalleryProps['albumSource'];
		selectedAlbums?: AlbumGalleryProps['selectedAlbums'];
		rootAlbumId?: AlbumGalleryProps['rootAlbumId'];
		rootGallery?: AlbumGalleryProps['rootGallery'];
		includeRoot?: AlbumGalleryProps['includeRoot'];
		showTitle?: AlbumGalleryProps['showTitle'];
		showAlbumTitle?: AlbumGalleryProps['showAlbumTitle'];
		showPhotoTitle?: AlbumGalleryProps['showPhotoTitle'];
		showCover?: AlbumGalleryProps['showCover'];
		coverAspect?: AlbumGalleryProps['coverAspect'];
		showDescription?: AlbumGalleryProps['showDescription'];
		showAlbumDescription?: AlbumGalleryProps['showAlbumDescription'];
		showPhotoDescription?: AlbumGalleryProps['showPhotoDescription'];
		descriptionLines?: AlbumGalleryProps['descriptionLines'];
		cardFieldOrder?: AlbumGalleryProps['cardFieldOrder'];
		albumCardFieldOrder?: AlbumGalleryProps['albumCardFieldOrder'];
		photoCardFieldOrder?: AlbumGalleryProps['photoCardFieldOrder'];
		albumCardLayout?: AlbumGalleryProps['albumCardLayout'];
		albumCard?: AlbumGalleryProps['albumCard'];
		photoCard?: AlbumGalleryProps['photoCard'];
		albumCardVariant?: AlbumGalleryProps['albumCardVariant'];
		photoGridVariant?: AlbumGalleryProps['photoGridVariant'];
		showPhotoCount?: AlbumGalleryProps['showPhotoCount'];
		showFeaturedBadge?: AlbumGalleryProps['showFeaturedBadge'];
		showAlbumFeaturedBadge?: AlbumGalleryProps['showAlbumFeaturedBadge'];
		showPhotoFeaturedBadge?: AlbumGalleryProps['showPhotoFeaturedBadge'];
		cardDataType?: AlbumGalleryProps['cardDataType'];
		mixedDisplayMode?: AlbumGalleryProps['mixedDisplayMode'];
		showSectionLabels?: AlbumGalleryProps['showSectionLabels'];
		showHeading?: AlbumGalleryProps['showHeading'];
		sortBy?: AlbumGalleryProps['sortBy'];
		sortDirection?: AlbumGalleryProps['sortDirection'];
		limit?: AlbumGalleryProps['limit'];
		className?: string;
		props?: LegacyAlbumGalleryProps;
		data?: unknown;
		[key: string]: unknown;
	} = $props();

	const config = $derived.by(() => {
		const p: LegacyAlbumGalleryProps | undefined =
			props && typeof props === 'object' ? props : undefined;
		const defaults: AlbumGalleryProps = {
			title,
			description,
			albumHeaderFieldOrder,
			showAlbumPageTitle,
			showAlbumPageDescription,
			showAlbumPageStats,
			showAlbumHero,
			albumSource,
			selectedAlbums,
			rootAlbumId,
			rootGallery,
			includeRoot,
			showTitle,
			showAlbumTitle,
			showPhotoTitle,
			showCover,
			coverAspect,
			showDescription,
			showAlbumDescription,
			showPhotoDescription,
			descriptionLines,
			cardFieldOrder,
			albumCardFieldOrder,
			photoCardFieldOrder,
			albumCardLayout,
			albumCard,
			photoCard,
			albumCardVariant,
			photoGridVariant,
			showPhotoCount,
			showFeaturedBadge,
			showAlbumFeaturedBadge,
			showPhotoFeaturedBadge,
			cardDataType,
			mixedDisplayMode,
			showSectionLabels,
			showHeading,
			sortBy,
			sortDirection,
			limit
		};
		const legacyConfig = p?.config && typeof p.config === 'object' ? p.config : undefined;
		const { className: _nestedCell, ...legacyRest } = (legacyConfig ?? {}) as Record<string, unknown>;
		const { className: _pCell, ...pRest } = (p ?? {}) as Record<string, unknown>;
		return { ...defaults, ...legacyRest, ...pRest, ...rest } satisfies AlbumGalleryProps;
	});
</script>

<Layout config={config} {data} />
