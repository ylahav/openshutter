<!-- frontend/src/lib/page-builder/modules/SocialMediaModule.svelte -->
<script lang="ts">
	import Layout from './SocialMedia/Layout.svelte';

	let {
		props,
		data,
		compact,
		...rest
	}: {
		props?: Record<string, unknown>;
		data?: unknown;
		compact?: boolean;
		[key: string]: unknown;
	} = $props();

	const config = $derived((props ?? rest) as Record<string, unknown>);
</script>

<Layout config={config || {}} />
