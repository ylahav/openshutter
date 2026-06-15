<script lang="ts">
	import Layout from './SiteTitle/Layout.svelte';

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

	const config = $derived.by(() => {
		if (props !== undefined && props !== null) {
			const p = props as Record<string, unknown>;
			return (p.config ?? p) as Record<string, unknown>;
		}
		return rest as Record<string, unknown>;
	});
</script>

<Layout {config} />
