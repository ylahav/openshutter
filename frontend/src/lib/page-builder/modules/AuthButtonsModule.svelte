<!-- frontend/src/lib/page-builder/modules/AuthButtonsModule.svelte -->
<script lang="ts">
	import Layout from './AuthButtons/Layout.svelte';

	export let props: any = undefined;
</script>

<Layout config={props || {}} />
