<!-- frontend/src/lib/page-builder/modules/RichTextModule.svelte -->
<script lang="ts">
	import Layout from './RichText/Layout.svelte';

	export let title: string | Record<string, string> | undefined;
	export let body: string | Record<string, string> = '';
	export let background: 'white' | 'gray' = 'white';

	// Support legacy: props or props.config; otherwise use individual props from spread
	export let props: any = undefined;
	$: config = props?.config ?? (props && typeof props === 'object' ? props : null) ?? {
		title, body, background
	};
	const data = null;
	const templateConfig = {};
</script>

<Layout config={config} {data} {templateConfig} />
