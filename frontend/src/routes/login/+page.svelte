<script lang="ts">
	import { productName } from '$stores/siteConfig';
	import LoginTemplateSwitcher from '$lib/components/LoginTemplateSwitcher.svelte';
</script>

<svelte:head>
	<title>Sign In - {$productName}</title>
</svelte:head>

<LoginTemplateSwitcher />
