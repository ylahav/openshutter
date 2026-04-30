<!-- frontend/src/lib/page-builder/modules/ThemeToggleModule.svelte -->
<script lang="ts">
	import Layout from './ThemeToggle/Layout.svelte';

	/** Page builder spreads `module.props` as top-level props — `variant` is not nested under `props`. */
	export let variant: string | undefined = undefined;
	export let props: Record<string, unknown> | undefined = undefined;

	$: resolvedVariant =
		variant === 'text' || props?.variant === 'text' ? 'text' : 'icons';
</script>

<Layout variant={resolvedVariant} />
