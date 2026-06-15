<!-- frontend/src/lib/page-builder/modules/ThemeToggleModule.svelte -->
<script lang="ts">
	import Layout from './ThemeToggle/Layout.svelte';

	/** Page builder spreads `module.props` as top-level props — `variant` is not nested under `props`. */
	let {
		variant = undefined,
		props,
		data,
		compact,
		...rest
	}: {
		variant?: string;
		props?: Record<string, unknown>;
		data?: unknown;
		compact?: boolean;
		[key: string]: unknown;
	} = $props();

	const resolvedVariant = $derived(
		variant === 'both' || props?.variant === 'both' || rest.variant === 'both'
			? 'both'
			: variant === 'text' || props?.variant === 'text' || rest.variant === 'text'
				? 'text'
				: 'icons'
	);
</script>

<Layout variant={resolvedVariant} />
