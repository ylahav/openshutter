<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import { getTemplatePack } from '$lib/template/packs/registry';

	export let mode: 'photos' | 'albums' = 'photos';
	export let albums: any[] = [];
	export let loading = false;
	export let error: string | null = null;

	$: packPromise = getTemplatePack($activeTemplate);
</script>

{#await packPromise then pack}
	<svelte:component this={pack.pages.Gallery} {mode} {albums} {loading} {error} />
{/await}
