<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import { getTemplatePack } from '$lib/template/packs/registry';
	import type {
		PackGalleryAlbumListItem,
		PackGalleryPageProps
	} from '$lib/template-packs/pack-page-props';

	export let mode: PackGalleryPageProps['mode'] = 'photos';
	export let albums: PackGalleryAlbumListItem[] = [];
	export let loading = false;
	export let error: string | null = null;

	$: packPromise = getTemplatePack($activeTemplate);
</script>

{#await packPromise then pack}
	<svelte:component this={pack.pages.Gallery} {mode} {albums} {loading} {error} />
{/await}
