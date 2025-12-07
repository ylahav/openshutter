<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Known routes that should not be handled here
	const knownRoutes = ['admin', 'api', 'login', 'albums', 'photos', 'owner', 'page'];

	onMount(() => {
		const alias = $page.params.alias;
		
		// Skip if it's a known route
		if (knownRoutes.includes(alias)) {
			return;
		}
		
		// Redirect to query parameter format
		goto(`/page?alias=${encodeURIComponent(alias)}`, { replaceState: true });
	});
</script>

<!-- This page will redirect immediately, so no content needed -->
