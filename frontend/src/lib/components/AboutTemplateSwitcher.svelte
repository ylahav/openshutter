<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import { getTemplatePack } from '$lib/template/packs/registry';
	import type { PackAboutPageProps } from '$lib/template-packs/pack-page-props';

	export let page: PackAboutPageProps['page'] = null;

	$: packPromise = getTemplatePack($activeTemplate);
</script>

{#await packPromise then pack}
	<svelte:component this={pack.pages.About} {page} />
{/await}
