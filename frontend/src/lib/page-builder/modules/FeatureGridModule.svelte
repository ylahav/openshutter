<!-- frontend/src/lib/page-builder/modules/FeatureGridModule.svelte -->
<script lang="ts">
	import Layout from './FeatureGrid/Layout.svelte';

	export let title: string | Record<string, string> = '';
	export let subtitle: string | Record<string, string> | undefined;
	export let features: Array<{
		title: string | Record<string, string>;
		description: string | Record<string, string>;
		icon?: string;
	}> = [];

	// Support legacy: props or props.config; otherwise use individual props from spread
	export let props: any = undefined;
	$: config = props?.config ?? (props && typeof props === 'object' ? props : null) ?? {
		title, subtitle, features
	};
	const data = null;
	const templateConfig = {};
</script>

<Layout config={config} {data} {templateConfig} />
