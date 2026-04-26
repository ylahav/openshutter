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

	export let title: NonNullable<AlbumsGridProps['title']> = '';
	export let description: AlbumsGridProps['description'] = undefined;
	export let albumSource: NonNullable<AlbumsGridProps['albumSource']> = 'root';
	export let selectedAlbums: AlbumsGridProps['selectedAlbums'] = undefined;
	export let rootAlbumId: AlbumsGridProps['rootAlbumId'] = undefined;
	export let rootGallery: AlbumsGridProps['rootGallery'] = undefined;
	export let includeRoot: NonNullable<AlbumsGridProps['includeRoot']> = true;
	export let showCover: NonNullable<AlbumsGridProps['showCover']> = true;
	export let coverAspect: NonNullable<AlbumsGridProps['coverAspect']> = 'video';
	export let showDescription: NonNullable<AlbumsGridProps['showDescription']> = true;
	export let descriptionLines: NonNullable<AlbumsGridProps['descriptionLines']> = 2;
	export let cardFieldOrder: NonNullable<AlbumsGridProps['cardFieldOrder']> = ['cover', 'title', 'description', 'photoCount', 'featuredBadge'];
	export let albumCardLayout: NonNullable<AlbumsGridProps['albumCardLayout']> = 'stack';
	export let albumCard: AlbumsGridProps['albumCard'] = undefined;
	export let photoCard: AlbumsGridProps['photoCard'] = undefined;
	export let albumCardVariant: AlbumsGridProps['albumCardVariant'] = undefined;
	export let photoGridVariant: AlbumsGridProps['photoGridVariant'] = undefined;
	export let showPhotoCount: NonNullable<AlbumsGridProps['showPhotoCount']> = true;
	export let showFeaturedBadge: NonNullable<AlbumsGridProps['showFeaturedBadge']> = true;
	export let sortBy: NonNullable<AlbumsGridProps['sortBy']> = 'manual';
	export let sortDirection: NonNullable<AlbumsGridProps['sortDirection']> = 'asc';
	export let limit: NonNullable<AlbumsGridProps['limit']> = 12;
	export let showHeading: AlbumsGridProps['showHeading'] = undefined;

	// Temporary migration fallback for legacy nested props.config payloads
	export let props: LegacyAlbumsGridProps | undefined = undefined;
	export let data: unknown = null;

	$: config = (() => {
		const p: any = props && typeof props === 'object' ? props : undefined;
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
		return { ...defaults, ...(legacyConfig ?? {}), ...(p ?? {}) } satisfies AlbumsGridProps;
	})();
</script>

<Layout {config} {data} />
