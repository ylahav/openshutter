<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import { getTemplatePack } from '$lib/template/packs/registry';
	import type { PackAboutPageProps } from '$lib/template-packs/pack-page-props';

	let {
		page = null
	}: {
		page?: PackAboutPageProps['page'];
	} = $props();

const packPromise = $derived(getTemplatePack($activeTemplate));</script>

{#await packPromise then pack}
	{@const About = pack.pages.About}
	<About {page} />
{/await}
