<script lang="ts">
	import type { PageData } from '../../routes/$types';
	import { activeTemplate } from '$stores/template';
	import ModernHome from '$lib/templates/modern/Home.svelte';

	export let data: PageData;
</script>

{#if $activeTemplate === 'modern'}
	<ModernHome {data} />
{:else}
	<!-- Fallback: use modern layout for other templates until they are migrated -->
	<ModernHome {data} />
{/if}

