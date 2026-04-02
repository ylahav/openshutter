<script lang="ts">
	import AlbumGalleryLayout from '../AlbumGallery/Layout.svelte';

	type AlbumsGridConfig = {
		title?: string | Record<string, string>;
		description?: string | Record<string, string>;
		albumSource?: 'root' | 'featured' | 'selected' | 'current';
		selectedAlbums?: string[];
		rootAlbumId?: string;
		rootGallery?: string;
		includeRoot?: boolean;
	};

	export let config: AlbumsGridConfig = {};
	export let data: unknown = null;
</script>

<!-- Reuse existing album listing UI while keeping a dedicated albumsGrid module contract/file structure. -->
<AlbumGalleryLayout {config} {data} templateConfig={{}} />
