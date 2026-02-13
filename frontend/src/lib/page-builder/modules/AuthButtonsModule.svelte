<!-- frontend/src/lib/page-builder/modules/AuthButtonsModule.svelte -->
<script lang="ts">
	import Layout from './AuthButtons/Layout.svelte';

	export let props: any = undefined;
	const data = null;
	const templateConfig = {};
</script>

<Layout config={props || {}} {data} {templateConfig} />
