<script lang="ts">
	import type { PageData } from './$types';
	import HomeTemplateSwitcher from '$components/HomeTemplateSwitcher.svelte';

	export let data: PageData;
</script>

<svelte:head>
	<title>OpenShutter</title>
</svelte:head>

<HomeTemplateSwitcher {data} />
