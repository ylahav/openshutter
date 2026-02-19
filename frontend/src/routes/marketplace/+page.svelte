<script lang="ts">
	import type { PageData } from './$types';

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
	<title>Marketplace - OpenShutter</title>
	<meta name="description" content="Integrations, tools, and apps that use the OpenShutter API" />
</svelte:head>

<div class="max-w-5xl mx-auto px-4 py-8">
	<header class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Marketplace</h1>
		<p class="mt-2 text-gray-600">
			Integrations, tools, and apps that work with the OpenShutter API.
		</p>
		<div class="mt-4 flex flex-wrap items-center gap-3">
			<a href="/marketplace/submit" class="text-sm font-medium text-primary-600 hover:underline">Submit an integration</a>
		</div>
		<div class="mt-4 flex flex-wrap gap-2">
			<a
				href="/marketplace"
				class="px-3 py-1.5 rounded-full text-sm font-medium {!data.category ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
			>
				All
			</a>
			{#each Object.entries(CATEGORY_LABELS) as [value, label]}
				<a
					href="/marketplace?category={value}"
					class="px-3 py-1.5 rounded-full text-sm font-medium {data.category === value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
				>
					{label}
				</a>
			{/each}
		</div>
	</header>

	{#if data.listings.length === 0}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
			<p>No integrations listed yet.</p>
			<p class="mt-2 text-sm">
				<a href="/developers" class="text-primary-600 hover:underline">Developer portal</a> — create API keys and submit your integration.
			</p>
		</div>
	{:else}
		<ul class="grid grid-cols-1 md:grid-cols-2 gap-6">
			{#each data.listings as listing}
				<li>
					<a
						href="/marketplace/{listing._id}"
						class="block h-full p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-primary-500 hover:shadow transition"
					>
						<span class="inline-block px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
							{CATEGORY_LABELS[listing.category] || listing.category}
						</span>
						<h2 class="mt-2 text-xl font-semibold text-gray-900">{listing.name}</h2>
						<p class="mt-1 text-sm text-gray-600 line-clamp-2">{listing.description}</p>
						<p class="mt-2 text-xs text-gray-500">by {listing.developerName} · v{listing.version}</p>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
