<!-- frontend/src/lib/page-builder/modules/ThemeSelectModule.svelte -->
<script lang="ts">
	import Layout from './ThemeSelect/Layout.svelte';

	export let props: any = undefined;
	const data = null;
	const templateConfig = {};
</script>

<Layout config={props || {}} {data} {templateConfig} />
