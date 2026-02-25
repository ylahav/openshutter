<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { productName } from '$stores/siteConfig';

	// Swagger UI is served by the backend at /api/v1/docs when backend is running
	let docsUrl = '';
	onMount(() => {
		if (browser) {
			// Same origin as frontend; backend proxy serves /api
			docsUrl = '/api/v1/docs';
		}
	});
</script>

<svelte:head>
	<title>API Docs - Developer Portal - {$productName}</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">API Documentation</h1>
		<p class="mt-1 text-gray-600">
			Interactive OpenAPI (Swagger) documentation for the public API v1.
		</p>
	</div>

	{#if docsUrl}
		<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
			<div class="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
				<span class="text-sm text-gray-600">Swagger UI is served by the backend.</span>
				<a
					href={docsUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded hover:bg-primary-700"
				>
					Open in new tab →
				</a>
			</div>
			<iframe
				title="API Documentation"
				src={docsUrl}
				class="w-full border-0 rounded-b-lg"
				style="height: calc(100vh - 280px); min-height: 500px;"
			/>
		</div>
		<p class="text-sm text-gray-500">
			If the frame is empty, ensure the backend is running and Swagger is enabled (<code class="bg-gray-100 px-1 rounded">ENABLE_SWAGGER=true</code> in production). See <code class="bg-gray-100 px-1 rounded">backend/SWAGGER_SETUP.md</code>.
		</p>
	{:else}
		<p class="text-gray-600">Loading...</p>
	{/if}
</div>
