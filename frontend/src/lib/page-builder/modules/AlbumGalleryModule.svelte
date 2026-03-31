<!-- frontend/src/lib/page-builder/modules/AlbumGalleryModule.svelte -->
<script lang="ts">
	import Layout from './AlbumGallery/Layout.svelte';

	type AlbumGalleryProps = {
		title?: string | Record<string, string>;
		description?: string | Record<string, string>;
		albumSource?: 'root' | 'featured' | 'selected' | 'current';
		selectedAlbums?: string[];
		rootAlbumId?: string;
		rootGallery?: string;
		includeRoot?: boolean;
	};

	type LegacyAlbumGalleryProps = {
		config?: AlbumGalleryProps;
	} & AlbumGalleryProps;

	export let title: NonNullable<AlbumGalleryProps['title']> = '';
	export let description: AlbumGalleryProps['description'] = undefined;
	export let albumSource: NonNullable<AlbumGalleryProps['albumSource']> = 'root';
	export let selectedAlbums: AlbumGalleryProps['selectedAlbums'] = undefined;
	export let rootAlbumId: AlbumGalleryProps['rootAlbumId'] = undefined;
	export let rootGallery: AlbumGalleryProps['rootGallery'] = undefined;
	export let includeRoot: NonNullable<AlbumGalleryProps['includeRoot']> = true;

	// Temporary migration fallback for legacy nested props.config payloads
	export let props: LegacyAlbumGalleryProps | undefined = undefined;
	export let data: unknown = null; // Page context (e.g., URL params like alias)
	$: config = (props?.config ??
		(props && typeof props === 'object' ? props : undefined) ?? {
			title,
			description,
			albumSource,
			selectedAlbums,
			rootAlbumId,
			rootGallery,
			includeRoot
		}) satisfies AlbumGalleryProps;
	const templateConfig = {};
</script>

<Layout config={config} {data} {templateConfig} />
