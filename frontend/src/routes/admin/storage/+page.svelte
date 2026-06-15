<script lang="ts">
	import OwnerStorageView from '$lib/components/OwnerStorageView.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Storage management - Admin</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-6xl mx-auto px-4">
		<OwnerStorageView
			isSiteAdmin={data.isSiteAdmin === true}
			backHref={data.isSiteAdmin ? '/admin' : '/owner'}
			initialStorageConfigs={data.storageConfigs}
			initialStorageLoadError={data.storageLoadError}
		/>
	</div>
</div>
