<script lang="ts">
	import type { PageData } from '../../routes/$types';
	import { activeTemplate } from '$stores/template';
	import { getTemplatePack } from '$lib/template-packs/registry';

	export let data: PageData;

	$: pack = getTemplatePack($activeTemplate);
</script>

<svelte:component this={pack.pages.Home} {data} />
