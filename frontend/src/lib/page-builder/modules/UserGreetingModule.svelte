<!-- frontend/src/lib/page-builder/modules/UserGreetingModule.svelte -->
<script lang="ts">
	import Layout from './UserGreeting/Layout.svelte';

	export let props: any = undefined;
</script>

<Layout config={props || {}} />
