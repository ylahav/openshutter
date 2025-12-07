<script lang="ts">
	import type { PageData } from '../../routes/$types';
	import { activeTemplate } from '$stores/template';
	import ModernHome from '$lib/templates/modern/Home.svelte';
	import DefaultHome from '$lib/templates/default/Home.svelte';

	export let data: PageData;
</script>

{#if $activeTemplate === 'default'}
	<DefaultHome {data} />
{:else if $activeTemplate === 'modern'}
	<ModernHome {data} />
{:else}
	<!-- Fallback: use default template for other templates -->
	<DefaultHome {data} />
{/if}
