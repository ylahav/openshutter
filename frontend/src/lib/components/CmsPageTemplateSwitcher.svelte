<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import { getTemplatePack } from '$lib/template-packs/registry';
	import type { PageData } from '$lib/types/page-builder';

	export let page: PageData | null = null;
	export let error: string | null = null;

	$: packPromise = getTemplatePack($activeTemplate);
</script>

{#await packPromise then pack}
	<svelte:component this={pack.pages.CmsPage} {page} {error} />
{/await}
