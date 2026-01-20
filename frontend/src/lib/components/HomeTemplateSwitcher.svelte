<script lang="ts">
	import type { PageData } from '../../routes/$types';
	import { activeTemplate } from '$stores/template';
	import DefaultHome from '$lib/templates/default/Home.svelte';
	import ModernHome from '$lib/templates/modern/Home.svelte';
	import MinimalHome from '$lib/templates/minimal/Home.svelte';
	import ElegantHome from '$lib/templates/elegant/Home.svelte';

	export let data: PageData;
</script>

{#if $activeTemplate === 'minimal'}
	<MinimalHome {data} />
{:else if $activeTemplate === 'modern'}
	<ModernHome {data} />
{:else if $activeTemplate === 'elegant'}
	<ElegantHome {data} />
{:else if $activeTemplate === 'default'}
	<DefaultHome {data} />
{:else}
	<!-- Fallback: use default template for other templates -->
	<DefaultHome {data} />
{/if}
