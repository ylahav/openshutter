<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import { getTemplatePack } from '$lib/template/packs/registry';
	import type { PackContactPageProps } from '$lib/template-packs/pack-page-props';

	let {
		page = null
	}: {
		page?: PackContactPageProps['page'];
	} = $props();

const packPromise = $derived(getTemplatePack($activeTemplate));</script>

{#await packPromise then pack}
	{@const Contact = pack.pages.Contact}
	<Contact {page} />
{/await}
