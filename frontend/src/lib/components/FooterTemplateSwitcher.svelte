<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import DefaultFooter from '$lib/templates/default/components/Footer.svelte';
	import ModernFooter from '$lib/templates/modern/components/Footer.svelte';
	import MinimalFooter from '$lib/templates/minimal/components/Footer.svelte';
	import ElegantFooter from '$lib/templates/elegant/components/Footer.svelte';
</script>

{#if $activeTemplate === 'minimal'}
	<MinimalFooter />
{:else if $activeTemplate === 'modern'}
	<ModernFooter />
{:else if $activeTemplate === 'elegant'}
	<ElegantFooter />
{:else if $activeTemplate === 'default'}
	<DefaultFooter />
{:else}
	<!-- Fallback: use default template -->
	<DefaultFooter />
{/if}
