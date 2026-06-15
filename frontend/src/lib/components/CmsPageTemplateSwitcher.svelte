<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import { getTemplatePack } from '$lib/template/packs/registry';
	import type { PackCmsPageProps } from '$lib/template-packs/pack-page-props';

	let {
		page = null,
		error = null
	}: {
		page?: PackCmsPageProps['page'];
		error?: PackCmsPageProps['error'];
	} = $props();

const packPromise = $derived(getTemplatePack($activeTemplate));</script>

{#await packPromise then pack}
	<svelte:component this={pack.pages.CmsPage} {page} {error} />
{/await}
