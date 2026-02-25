<script lang="ts">
	import ForcePasswordChangeModal from '$lib/components/ForcePasswordChangeModal.svelte';
	import { invalidateAll } from '$app/navigation';
	import { productName } from '$stores/siteConfig';

	export let data: { redirect: string };

	async function onSuccess() {
		await invalidateAll();
		window.location.href = data.redirect;
	}
</script>

<svelte:head>
	<title>Change password required - {$productName}</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
	<ForcePasswordChangeModal onSuccess={onSuccess} />
</div>
