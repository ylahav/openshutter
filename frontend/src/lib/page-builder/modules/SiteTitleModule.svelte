<script lang="ts">
	import Layout from './SiteTitle/Layout.svelte';

	export let props: any = undefined;
	$: config = props?.config ?? props ?? {};
	const templateConfig = {};
</script>

<Layout config={config} {templateConfig} />
