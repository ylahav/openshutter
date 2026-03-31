<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import { getTemplatePack } from '$lib/template-packs/registry';

	$: pack = getTemplatePack($activeTemplate);
</script>

<svelte:component this={pack.pages.Album} />
