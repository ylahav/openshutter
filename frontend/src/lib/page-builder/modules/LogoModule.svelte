<script lang="ts">
	import Layout from './Logo/Layout.svelte';

	export let props: any = undefined;
	$: config = props?.config ?? props ?? {};
</script>

<Layout {config} />
