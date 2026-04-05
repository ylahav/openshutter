<!-- frontend/src/lib/page-builder/modules/ThemeSelectModule.svelte -->
<script lang="ts">
	import Layout from './ThemeSelect/Layout.svelte';

	export let props: any = undefined;
</script>

<Layout config={props || {}} />
