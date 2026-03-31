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

	// Temporary migration fallback for legacy nested props.config payloads
	export let props: LegacyAlbumsGridProps | undefined = undefined;
	export let data: unknown = null;

	$: config = (props?.config ??
		(props && typeof props === 'object' ? props : undefined) ?? {
			title,
			description,
			albumSource,
			selectedAlbums,
			rootAlbumId,
			rootGallery,
			includeRoot
		}) satisfies AlbumsGridProps;
</script>

<Layout {config} {data} />
