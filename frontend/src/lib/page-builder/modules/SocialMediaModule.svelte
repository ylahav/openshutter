<!-- frontend/src/lib/page-builder/modules/SocialMediaModule.svelte -->
<script lang="ts">
	import Layout from './SocialMedia/Layout.svelte';

	export let props: any = undefined;
</script>

<Layout config={props || {}} />
