<script lang="ts">
	import Layout from './AlbumsGrid/Layout.svelte';

	type AlbumsGridProps = {
		title?: string | Record<string, string>;
		description?: string | Record<string, string>;
		albumSource?: 'root' | 'featured' | 'selected' | 'current';
		selectedAlbums?: string[];
		rootAlbumId?: string;
		rootGallery?: string;
		includeRoot?: boolean;
		showCover?: boolean;
		coverAspect?: 'video' | 'square' | 'portrait';
		showDescription?: boolean;
		descriptionLines?: number;
		cardFieldOrder?: Array<'title' | 'cover' | 'description' | 'photoCount' | 'featuredBadge'>;
		albumCardLayout?: 'stack' | 'row';
		albumCard?: string;
		photoCard?: string;
		albumCardVariant?: string;
		photoGridVariant?: string;
		showPhotoCount?: boolean;
		showFeaturedBadge?: boolean;
		sortBy?: 'manual' | 'order' | 'name' | 'photoCount' | 'createdAt' | 'lastPhotoDate';
		sortDirection?: 'asc' | 'desc';
		limit?: number;
		/** When false, hides "Sub-albums" / "Photos" labels above the grid. */
		showHeading?: boolean;
	};

	type LegacyAlbumsGridProps = {
		config?: AlbumsGridProps;
	} & AlbumsGridProps;

	let {
		title = '',
		description = undefined,
		albumSource = 'root',
		selectedAlbums = undefined,
		rootAlbumId = undefined,
		rootGallery = undefined,
		includeRoot = true,
		showCover = true,
		coverAspect = 'video',
		showDescription = true,
		descriptionLines = 2,
		cardFieldOrder = ['cover', 'title', 'description', 'photoCount', 'featuredBadge'],
		albumCardLayout = 'stack',
		albumCard = undefined,
		photoCard = undefined,
		albumCardVariant = undefined,
		photoGridVariant = undefined,
		showPhotoCount = true,
		showFeaturedBadge = true,
		sortBy = 'manual',
		sortDirection = 'asc',
		limit = 12,
		showHeading = undefined,
		className: _cellClass = undefined,
		props,
		data = null,
		...rest
	}: {
		title?: AlbumsGridProps['title'];
		description?: AlbumsGridProps['description'];
		albumSource?: AlbumsGridProps['albumSource'];
		selectedAlbums?: AlbumsGridProps['selectedAlbums'];
		rootAlbumId?: AlbumsGridProps['rootAlbumId'];
		rootGallery?: AlbumsGridProps['rootGallery'];
		includeRoot?: AlbumsGridProps['includeRoot'];
		showCover?: AlbumsGridProps['showCover'];
		coverAspect?: AlbumsGridProps['coverAspect'];
		showDescription?: AlbumsGridProps['showDescription'];
		descriptionLines?: AlbumsGridProps['descriptionLines'];
		cardFieldOrder?: AlbumsGridProps['cardFieldOrder'];
		albumCardLayout?: AlbumsGridProps['albumCardLayout'];
		albumCard?: AlbumsGridProps['albumCard'];
		photoCard?: AlbumsGridProps['photoCard'];
		albumCardVariant?: AlbumsGridProps['albumCardVariant'];
		photoGridVariant?: AlbumsGridProps['photoGridVariant'];
		showPhotoCount?: AlbumsGridProps['showPhotoCount'];
		showFeaturedBadge?: AlbumsGridProps['showFeaturedBadge'];
		sortBy?: AlbumsGridProps['sortBy'];
		sortDirection?: AlbumsGridProps['sortDirection'];
		limit?: AlbumsGridProps['limit'];
		showHeading?: AlbumsGridProps['showHeading'];
		className?: string;
		props?: LegacyAlbumsGridProps;
		data?: unknown;
		[key: string]: unknown;
	} = $props();

	const config = $derived.by(() => {
		const p: LegacyAlbumsGridProps | undefined =
			props && typeof props === 'object' ? props : undefined;
		const defaults: AlbumsGridProps = {
			title,
			description,
			albumSource,
			selectedAlbums,
			rootAlbumId,
			rootGallery,
			includeRoot,
			showCover,
			coverAspect,
			showDescription,
			descriptionLines,
			cardFieldOrder,
			albumCardLayout,
			albumCard,
			photoCard,
			albumCardVariant,
			photoGridVariant,
			showPhotoCount,
			showFeaturedBadge,
			sortBy,
			sortDirection,
			limit,
			showHeading
		};
		const legacyConfig = p?.config && typeof p.config === 'object' ? p.config : undefined;
		const { className: _nestedCell, ...legacyRest } = (legacyConfig ?? {}) as Record<string, unknown>;
		const { className: _pCell, ...pRest } = (p ?? {}) as Record<string, unknown>;
		return { ...defaults, ...legacyRest, ...pRest, ...rest } satisfies AlbumsGridProps;
	});
</script>

<Layout {config} {data} />
