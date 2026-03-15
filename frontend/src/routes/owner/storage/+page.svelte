<script lang="ts">
	import OwnerStorageView from '$lib/components/OwnerStorageView.svelte';
</script>

<svelte:head>
	<title>Storage management - Owner</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-6xl mx-auto px-4">
		<OwnerStorageView backHref="/owner" />
	</div>
</div>
