<script lang="ts">
	import Layout from './Menu/Layout.svelte';

	export let props: any = undefined;
	$: config = props?.config ?? props ?? {};
	const templateConfig = {};
</script>

<Layout config={config} {templateConfig} />
