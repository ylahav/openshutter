<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import { getTemplatePack } from '$lib/template/packs/registry';
	import type { PackContactPageProps } from '$lib/template-packs/pack-page-props';

	export let page: PackContactPageProps['page'] = null;

	$: packPromise = getTemplatePack($activeTemplate);
</script>

{#await packPromise then pack}
	<svelte:component this={pack.pages.Contact} {page} />
{/await}
