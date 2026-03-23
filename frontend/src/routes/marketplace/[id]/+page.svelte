<script lang="ts">
	import type { PageData } from './$types';
	import { productName } from '$stores/siteConfig';

	export let data: PageData;

	const CATEGORY_LABELS: Record<string, string> = {
		integration: 'Integration',
		tool: 'Tool',
		app: 'App',
		script: 'Script',
		theme: 'Theme',
	};
</script>

<svelte:head>
	<title>{data.listing?.name ?? 'Listing'} - Marketplace - {$productName}</title>
</svelte:head>

<div class="max-w-3xl mx-auto px-4 py-8">
	<a href="/marketplace" class="text-sm text-primary-600 hover:underline mb-4 inline-block">← Marketplace</a>

	{#if !data.listing}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
			<p>Listing not found or not yet approved.</p>
		</div>
	{:else}
		<article class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
			<div class="p-6">
				<div class="flex flex-wrap gap-1.5">
					{#if data.listing.featured}
						<span class="inline-block px-2 py-0.5 text-xs font-medium rounded bg-primary-100 text-primary-800">Featured</span>
					{/if}
					<span class="inline-block px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
						{CATEGORY_LABELS[data.listing.category] || data.listing.category}
					</span>
				</div>
				<h1 class="mt-2 text-2xl font-bold text-gray-900">{data.listing.name}</h1>
				{#if data.listing.tags?.length}
					<p class="mt-2 flex flex-wrap gap-1.5">
						{#each data.listing.tags as tag}
							<span class="text-sm text-gray-500">#{tag}</span>
						{/each}
					</p>
				{/if}
				<p class="mt-2 text-gray-600 whitespace-pre-wrap">{data.listing.description}</p>
				{#if data.listing.screenshots?.length}
					<div class="mt-6">
						<h2 class="text-sm font-medium text-gray-700 mb-2">Screenshots</h2>
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{#each data.listing.screenshots as url}
								<a href={url} target="_blank" rel="noopener noreferrer" class="block rounded-md border border-gray-200 overflow-hidden bg-gray-50 hover:opacity-90">
									<img src={url} alt="" class="w-full h-auto max-h-64 object-contain" loading="lazy" />
								</a>
							{/each}
						</div>
					</div>
				{/if}
				<dl class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
					<div>
						<dt class="text-gray-500">Developer</dt>
						<dd class="font-medium text-gray-900">{data.listing.developerName}</dd>
					</div>
					<div>
						<dt class="text-gray-500">Version</dt>
						<dd class="font-medium text-gray-900">{data.listing.version}</dd>
					</div>
					<div>
						<dt class="text-gray-500">API version</dt>
						<dd class="font-medium text-gray-900">{(data.listing.apiVersionCompatible || ['v1']).join(', ')}</dd>
					</div>
				</dl>
				<div class="mt-6 flex flex-wrap gap-3">
					{#if data.listing.documentationUrl}
						<a
							href={data.listing.documentationUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
						>
							Documentation →
						</a>
					{/if}
					{#if data.listing.downloadUrl}
						<a
							href={data.listing.downloadUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900"
						>
							Download
						</a>
					{/if}
					{#if data.listing.repositoryUrl}
						<a
							href={data.listing.repositoryUrl}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
						>
							Repository
						</a>
					{/if}
				</div>
			</div>
		</article>
	{/if}
</div>
