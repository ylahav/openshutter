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
		showPhotoCount?: boolean;
		showFeaturedBadge?: boolean;
		showAlbumFeaturedBadge?: boolean;
		showPhotoFeaturedBadge?: boolean;
		cardDataType?: 'subAlbums' | 'photos' | 'both';
		mixedDisplayMode?: 'grouped' | 'interleaved';
		showSectionLabels?: boolean;
		sortBy?: 'manual' | 'order' | 'name' | 'photoCount' | 'createdAt' | 'lastPhotoDate';
		sortDirection?: 'asc' | 'desc';
		limit?: number;
	};

	type LegacyAlbumGalleryProps = {
		config?: AlbumGalleryProps;
	} & AlbumGalleryProps;

	export let title: NonNullable<AlbumGalleryProps['title']> = '';
	export let description: AlbumGalleryProps['description'] = undefined;
	export let albumHeaderFieldOrder: NonNullable<AlbumGalleryProps['albumHeaderFieldOrder']> = ['albumTitle', 'albumDescription', 'albumStats'];
	export let showAlbumPageTitle: NonNullable<AlbumGalleryProps['showAlbumPageTitle']> = true;
	export let showAlbumPageDescription: NonNullable<AlbumGalleryProps['showAlbumPageDescription']> = true;
	export let showAlbumPageStats: NonNullable<AlbumGalleryProps['showAlbumPageStats']> = true;
	export let albumSource: NonNullable<AlbumGalleryProps['albumSource']> = 'root';
	export let selectedAlbums: AlbumGalleryProps['selectedAlbums'] = undefined;
	export let rootAlbumId: AlbumGalleryProps['rootAlbumId'] = undefined;
	export let rootGallery: AlbumGalleryProps['rootGallery'] = undefined;
	export let includeRoot: NonNullable<AlbumGalleryProps['includeRoot']> = true;
	export let showTitle: NonNullable<AlbumGalleryProps['showTitle']> = true;
	export let showAlbumTitle: NonNullable<AlbumGalleryProps['showAlbumTitle']> = true;
	export let showPhotoTitle: NonNullable<AlbumGalleryProps['showPhotoTitle']> = true;
	export let showCover: NonNullable<AlbumGalleryProps['showCover']> = true;
	export let coverAspect: NonNullable<AlbumGalleryProps['coverAspect']> = 'video';
	export let showDescription: NonNullable<AlbumGalleryProps['showDescription']> = true;
	export let showAlbumDescription: NonNullable<AlbumGalleryProps['showAlbumDescription']> = true;
	export let showPhotoDescription: NonNullable<AlbumGalleryProps['showPhotoDescription']> = true;
	export let descriptionLines: NonNullable<AlbumGalleryProps['descriptionLines']> = 2;
	export let cardFieldOrder: NonNullable<AlbumGalleryProps['cardFieldOrder']> = ['cover', 'title', 'description', 'photoCount', 'featuredBadge'];
	export let albumCardFieldOrder: NonNullable<AlbumGalleryProps['albumCardFieldOrder']> = ['cover', 'title', 'description', 'photoCount', 'featuredBadge'];
	export let photoCardFieldOrder: NonNullable<AlbumGalleryProps['photoCardFieldOrder']> = ['cover', 'title', 'description', 'featuredBadge'];
	export let showPhotoCount: NonNullable<AlbumGalleryProps['showPhotoCount']> = true;
	export let showFeaturedBadge: NonNullable<AlbumGalleryProps['showFeaturedBadge']> = true;
	export let showAlbumFeaturedBadge: NonNullable<AlbumGalleryProps['showAlbumFeaturedBadge']> = true;
	export let showPhotoFeaturedBadge: NonNullable<AlbumGalleryProps['showPhotoFeaturedBadge']> = true;
	export let cardDataType: NonNullable<AlbumGalleryProps['cardDataType']> = 'both';
	export let mixedDisplayMode: NonNullable<AlbumGalleryProps['mixedDisplayMode']> = 'grouped';
	export let showSectionLabels: NonNullable<AlbumGalleryProps['showSectionLabels']> = true;
	export let sortBy: NonNullable<AlbumGalleryProps['sortBy']> = 'manual';
	export let sortDirection: NonNullable<AlbumGalleryProps['sortDirection']> = 'asc';
	export let limit: NonNullable<AlbumGalleryProps['limit']> = 12;

	// Temporary migration fallback for legacy nested props.config payloads
	export let props: LegacyAlbumGalleryProps | undefined = undefined;
	export let data: unknown = null; // Page context (e.g., URL params like alias)
	$: config = (() => {
		// Legacy merge:
		// Some old saved payloads stored album view fields under `props.config`.
		// If that exists AND the editor also stores flat fields on `props`,
		// we must merge so editor changes take effect.
		const p: any = props && typeof props === 'object' ? props : undefined;
		const defaults: AlbumGalleryProps = {
			title,
			description,
			albumHeaderFieldOrder,
			showAlbumPageTitle,
			showAlbumPageDescription,
			showAlbumPageStats,
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
			showPhotoCount,
			showFeaturedBadge,
			showAlbumFeaturedBadge,
			showPhotoFeaturedBadge,
			cardDataType,
			mixedDisplayMode,
			showSectionLabels,
			sortBy,
			sortDirection,
			limit
		};
		const legacyConfig = p?.config && typeof p.config === 'object' ? p.config : undefined;
		return { ...defaults, ...(legacyConfig ?? {}), ...(p ?? {}) } satisfies AlbumGalleryProps;
	})();
</script>

<Layout config={config} {data} />
