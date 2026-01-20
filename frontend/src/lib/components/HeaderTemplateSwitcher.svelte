<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import DefaultHeader from '$lib/templates/default/components/Header.svelte';
	import ModernHeader from '$lib/templates/modern/components/Header.svelte';
	import MinimalHeader from '$lib/templates/minimal/components/Header.svelte';
	import ElegantHeader from '$lib/templates/elegant/components/Header.svelte';
</script>

{#if $activeTemplate === 'minimal'}
	<MinimalHeader />
{:else if $activeTemplate === 'modern'}
	<ModernHeader />
{:else if $activeTemplate === 'elegant'}
	<ElegantHeader />
{:else if $activeTemplate === 'default'}
	<DefaultHeader />
{:else}
	<!-- Fallback: use default template -->
	<DefaultHeader />
{/if}
