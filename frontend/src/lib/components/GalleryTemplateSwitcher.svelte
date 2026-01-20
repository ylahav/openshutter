<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import DefaultGallery from '$lib/templates/default/Gallery.svelte';
	import ModernGallery from '$lib/templates/modern/Gallery.svelte';
	import MinimalGallery from '$lib/templates/minimal/Gallery.svelte';
	import ElegantGallery from '$lib/templates/elegant/Gallery.svelte';
</script>

{#if $activeTemplate === 'minimal'}
	<MinimalGallery />
{:else if $activeTemplate === 'modern'}
	<ModernGallery />
{:else if $activeTemplate === 'elegant'}
	<ElegantGallery />
{:else if $activeTemplate === 'default'}
	<DefaultGallery />
{:else}
	<!-- Fallback: use default template for other templates -->
	<DefaultGallery />
{/if}
