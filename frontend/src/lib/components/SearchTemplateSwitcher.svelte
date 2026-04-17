<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import { getTemplatePack } from '$lib/template/packs/registry';
	import type { PackSearchPageProps } from '$lib/template-packs/pack-page-props';

	export let initialQuery = '';
	export let variant: NonNullable<PackSearchPageProps['variant']> = 'default';

	$: packPromise = getTemplatePack($activeTemplate);
</script>

{#await packPromise then pack}
	<svelte:component this={pack.pages.Search} {initialQuery} {variant} />
{/await}
