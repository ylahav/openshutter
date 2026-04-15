<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import { getTemplatePack } from '$lib/template-packs/registry';

	export let initialQuery = '';
	export let variant: 'noir' | 'default' = 'default';

	$: packPromise = getTemplatePack($activeTemplate);
</script>

{#await packPromise then pack}
	<svelte:component this={pack.pages.Search} {initialQuery} {variant} />
{/await}
