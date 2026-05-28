<script lang="ts">

	import { page } from '$app/stores';

	import OwnerStorageView from '$lib/components/OwnerStorageView.svelte';

	import type { PageData } from './$types';



	export let data: PageData;



	$: provider = $page.url.searchParams.get('provider') ?? '';

	$: panelKey = $page.url.search;

</script>



<svelte:head>

	<title>Storage management - Admin</title>

</svelte:head>



<div class="py-8">

	<div class="max-w-6xl mx-auto px-4">

		{#key panelKey}

			<OwnerStorageView

				isSiteAdmin={true}

				backHref="/admin"

				initialProvider={provider}

				initialStorageConfigs={data.initialStorageConfigs}

				storageLoadError={data.storageLoadError}

			/>

		{/key}

	</div>

</div>

