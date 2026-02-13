<!-- frontend/src/lib/page-builder/modules/ThemeToggleModule.svelte -->
<script lang="ts">
	import Layout from './ThemeToggle/Layout.svelte';

	export let props: any = undefined;
	const data = null;
	const templateConfig = {};
</script>

<Layout config={props || {}} {data} {templateConfig} />
