<script lang="ts">
	import type { PageData } from './$types';
	import { productName } from '$stores/siteConfig';
	import { t } from '$stores/i18n';

	export let data: PageData;

	$: featuredListings = (data.listings || []).filter((l: { featured?: boolean }) => l.featured);
	$: otherListings = (data.listings || []).filter((l: { featured?: boolean }) => !l.featured);
	$: showFeaturedSection = featuredListings.length > 0 && !data.searchQuery && !data.category;

	const CATEGORY_LABELS: Record<string, string> = {
		integration: 'Integration',
		tool: 'Tool',
		app: 'App',
		script: 'Script',
		theme: 'Theme',
	};

	function buildSearchHref(params: { q?: string; category?: string }) {
		const p = new URLSearchParams();
		if (params.q) p.set('q', params.q);
		if (params.category) p.set('category', params.category);
		const s = p.toString();
		return '/marketplace' + (s ? `?${s}` : '');
	}
</script>

<svelte:head>
	<title>Marketplace - {$productName}</title>
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
		<form method="get" action="/marketplace" class="mt-4 flex gap-2 flex-wrap">
			<input type="hidden" name="category" value={data.category || ''} />
			<input
				type="search"
				name="q"
				value={data.searchQuery || ''}
				placeholder="Search by name, description, or tags..."
				class="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm"
			/>
			<button type="submit" class="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700">Search</button>
		</form>
		<div class="mt-4 flex flex-wrap gap-2">
			<a
				href={buildSearchHref({ q: data.searchQuery || undefined })}
				class="px-3 py-1.5 rounded-full text-sm font-medium {!data.category ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
			>
				All
			</a>
			{#each Object.entries(CATEGORY_LABELS) as [value, label]}
				<a
					href={buildSearchHref({ category: value, q: data.searchQuery || undefined })}
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
				<a href="/developers" class="text-primary-600 hover:underline">{$t('owner.developerPortal')}</a>
				— {$t('owner.developerApiDescription')}
			</p>
		</div>
	{:else}
		{#if showFeaturedSection}
			<section class="mb-10">
				<h2 class="text-xl font-semibold text-gray-900 mb-4">Featured</h2>
				<ul class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each featuredListings as listing}
						<li>
							<a
								href="/marketplace/{listing._id}"
								class="block h-full p-6 bg-white rounded-lg border-2 border-primary-200 shadow-sm hover:border-primary-500 hover:shadow transition"
							>
								<div class="flex flex-wrap gap-1.5">
									<span class="inline-block px-2 py-0.5 text-xs font-medium rounded bg-primary-100 text-primary-800">Featured</span>
									<span class="inline-block px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
										{CATEGORY_LABELS[listing.category] || listing.category}
									</span>
								</div>
								<h2 class="mt-2 text-xl font-semibold text-gray-900">{listing.name}</h2>
								<p class="mt-1 text-sm text-gray-600 line-clamp-2">{listing.description}</p>
								{#if listing.tags?.length}
									<p class="mt-2 flex flex-wrap gap-1">
										{#each listing.tags as tag}
											<span class="text-xs text-gray-500">#{tag}</span>
										{/each}
									</p>
								{/if}
								<p class="mt-2 text-xs text-gray-500">by {listing.developerName} · v{listing.version}</p>
							</a>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
		{#if otherListings.length > 0 || !showFeaturedSection}
			{#if showFeaturedSection}
				<h2 class="text-xl font-semibold text-gray-900 mb-4">All integrations</h2>
			{/if}
			<ul class="grid grid-cols-1 md:grid-cols-2 gap-6">
				{#each (showFeaturedSection ? otherListings : data.listings) as listing}
					<li>
						<a
							href="/marketplace/{listing._id}"
							class="block h-full p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-primary-500 hover:shadow transition"
						>
							<div class="flex flex-wrap gap-1.5">
								{#if listing.featured}
									<span class="inline-block px-2 py-0.5 text-xs font-medium rounded bg-primary-100 text-primary-800">Featured</span>
								{/if}
								<span class="inline-block px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">
									{CATEGORY_LABELS[listing.category] || listing.category}
								</span>
							</div>
							<h2 class="mt-2 text-xl font-semibold text-gray-900">{listing.name}</h2>
							<p class="mt-1 text-sm text-gray-600 line-clamp-2">{listing.description}</p>
							{#if listing.tags?.length}
								<p class="mt-2 flex flex-wrap gap-1">
									{#each listing.tags as tag}
										<span class="text-xs text-gray-500">#{tag}</span>
									{/each}
								</p>
							{/if}
							<p class="mt-2 text-xs text-gray-500">by {listing.developerName} · v{listing.version}</p>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>
