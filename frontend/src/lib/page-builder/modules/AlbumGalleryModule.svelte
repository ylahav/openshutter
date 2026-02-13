<!-- frontend/src/lib/page-builder/modules/AlbumGalleryModule.svelte -->
<script lang="ts">
	import Layout from './AlbumGallery/Layout.svelte';

	export let title: string | Record<string, string> = '';
	export let description: string | Record<string, string> | undefined;
	export let selectedAlbums: string[] | undefined = undefined;
	export let rootAlbumId: string | undefined = undefined;
	export let rootGallery: string | undefined = undefined;
	export let includeRoot: boolean = true;

	// Support legacy: props or props.config; otherwise use individual props from spread
	export let props: any = undefined;
	export let data: any = null; // Page context (e.g., URL params like alias)
	$: config = props?.config ?? (props && typeof props === 'object' ? props : null) ?? {
		title, description, selectedAlbums, rootAlbumId, rootGallery, includeRoot
	};
	const templateConfig = {};
</script>

<Layout config={config} {data} {templateConfig} />
