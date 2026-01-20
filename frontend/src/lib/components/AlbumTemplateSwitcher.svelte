<script lang="ts">
	import { activeTemplate } from '$stores/template';
	import DefaultAlbum from '$lib/templates/default/Album.svelte';
	import ModernAlbum from '$lib/templates/modern/Album.svelte';
	import MinimalAlbum from '$lib/templates/minimal/Album.svelte';
	import ElegantAlbum from '$lib/templates/elegant/Album.svelte';
</script>

{#if $activeTemplate === 'minimal'}
	<MinimalAlbum />
{:else if $activeTemplate === 'modern'}
	<ModernAlbum />
{:else if $activeTemplate === 'elegant'}
	<ElegantAlbum />
{:else if $activeTemplate === 'default'}
	<DefaultAlbum />
{:else}
	<!-- Fallback: use default template for other templates -->
	<DefaultAlbum />
{/if}
