<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import { getTemplatePack } from '$lib/template/packs/registry';
	import type { PackSearchPageProps } from '$lib/template-packs/pack-page-props';

	let {
		initialQuery = $bindable(''),
		variant = 'default'
	}: {
		initialQuery?: unknown;
		variant?: NonNullable<PackSearchPageProps['variant']>;
	} = $props();

const packPromise = $derived(getTemplatePack($activeTemplate));</script>

{#await packPromise then pack}
	{@const Search = pack.pages.Search}
	<Search {initialQuery} {variant} />
{/await}
