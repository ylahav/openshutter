<script lang="ts">
	import OwnerStorageView from '$lib/components/OwnerStorageView.svelte';

	export let data: { user?: { role?: string } };
</script>

<svelte:head>
	<title>Storage — Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-6xl mx-auto px-4">
		<OwnerStorageView backHref="/admin" isSiteAdmin={data.user?.role === 'admin'} />
	</div>
</div>
