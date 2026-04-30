<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import { getTemplatePack } from '$lib/template/packs/registry';
	import type { PackCmsPageProps } from '$lib/template-packs/pack-page-props';

	export let page: PackCmsPageProps['page'] = null;
	export let error: PackCmsPageProps['error'] = null;

	$: packPromise = getTemplatePack($activeTemplate);
</script>

{#await packPromise then pack}
	<svelte:component this={pack.pages.CmsPage} {page} {error} />
{/await}
