<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$lib/stores/language';

	interface SearchResult {
		_id: string;
		type: 'photo' | 'album' | 'person' | 'location';
		title?: string | { en?: string; he?: string };
		name?: string | { en?: string; he?: string };
		alias?: string;
		thumbnailUrl?: string;
		description?: string;
	}

	let query = $page.url.searchParams.get('q') || '';
	let type: 'all' | 'photos' | 'albums' | 'people' | 'locations' =
		($page.url.searchParams.get('type') as 'all' | 'photos' | 'albums' | 'people' | 'locations') || 'all';
	let results: SearchResult[] = [];
	let loading = false;
	let error: string | null = null;

	onMount(() => {
		if (query) {
			performSearch();
		}
	});

	$: if ($page.url.searchParams.get('q') !== query) {
		query = $page.url.searchParams.get('q') || '';
		if (query) {
			performSearch();
		}
	}

	async function performSearch() {
		if (!query.trim()) {
			results = [];
			return;
		}

		loading = true;
		error = null;

		try {
			const searchParams = new URLSearchParams({
				q: query,
				type: type
			});

			const response = await fetch(`/api/search?${searchParams}`);
			const data = await response.json();

			if (data.success) {
				results = [
					...(data.data.photos || []),
					...(data.data.albums || []),
					...(data.data.people || []),
					...(data.data.locations || [])
				];
			} else {
				error = data.error || 'Search failed';
			}
		} catch (err) {
			error = 'Search failed';
			console.error('Search error:', err);
		} finally {
			loading = false;
		}
	}

	function getResultTitle(result: SearchResult): string {
		if (result.title) {
			return typeof result.title === 'string'
				? result.title
				: MultiLangUtils.getTextValue(result.title, $currentLanguage);
		}
		if (result.name) {
			return typeof result.name === 'string'
				? result.name
				: MultiLangUtils.getTextValue(result.name, $currentLanguage);
		}
		return result.alias || 'Untitled';
	}
</script>

<svelte:head>
	<title>Mobile Search - OpenShutter</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
	<meta name="theme-color" content="#2563eb" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Mobile Header -->
	<header class="bg-white shadow-sm sticky top-0 z-10">
		<div class="px-4 py-3">
			<div class="flex items-center justify-between mb-4">
				<h1 class="text-xl font-bold text-gray-900">Search</h1>
				<button
					on:click={() => goto('/')}
					class="text-blue-600 hover:text-blue-700 text-sm font-medium"
				>
					Close
				</button>
			</div>

			<!-- Search Input -->
			<div class="flex gap-2">
				<input
					type="text"
					bind:value={query}
					on:keydown={(e) => {
						if (e.key === 'Enter') performSearch();
					}}
					placeholder="Search photos, albums, people..."
					class="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
				<button
					on:click={performSearch}
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
				>
					Search
				</button>
			</div>

			<!-- Type Filter -->
			<div class="mt-3 flex gap-2 overflow-x-auto">
				<button
					on:click={() => {
						type = 'all';
						if (query) performSearch();
					}}
					class="px-3 py-1 text-sm rounded-full whitespace-nowrap {type === 'all'
						? 'bg-blue-600 text-white'
						: 'bg-gray-200 text-gray-700'}"
				>
					All
				</button>
				<button
					on:click={() => {
						type = 'photos';
						if (query) performSearch();
					}}
					class="px-3 py-1 text-sm rounded-full whitespace-nowrap {type === 'photos'
						? 'bg-blue-600 text-white'
						: 'bg-gray-200 text-gray-700'}"
				>
					Photos
				</button>
				<button
					on:click={() => {
						type = 'albums';
						if (query) performSearch();
					}}
					class="px-3 py-1 text-sm rounded-full whitespace-nowrap {type === 'albums'
						? 'bg-blue-600 text-white'
						: 'bg-gray-200 text-gray-700'}"
				>
					Albums
				</button>
				<button
					on:click={() => {
						type = 'people';
						if (query) performSearch();
					}}
					class="px-3 py-1 text-sm rounded-full whitespace-nowrap {type === 'people'
						? 'bg-blue-600 text-white'
						: 'bg-gray-200 text-gray-700'}"
				>
					People
				</button>
				<button
					on:click={() => {
						type = 'locations';
						if (query) performSearch();
					}}
					class="px-3 py-1 text-sm rounded-full whitespace-nowrap {type === 'locations'
						? 'bg-blue-600 text-white'
						: 'bg-gray-200 text-gray-700'}"
				>
					Locations
				</button>
			</div>
		</div>
	</header>

	<!-- Results -->
	<main class="pb-8">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				<p class="ml-4 text-gray-600">Searching...</p>
			</div>
		{:else if error}
			<div class="px-4 py-8">
				<div class="bg-red-50 border border-red-200 rounded-md p-4">
					<p class="text-red-800">{error}</p>
				</div>
			</div>
		{:else if results.length > 0}
			<div class="grid grid-cols-2 gap-4 p-4">
				{#each results as item}
					<button
						on:click={() => {
							if (item.type === 'album') {
								goto(`/albums/${item.alias || item._id}`);
							} else if (item.type === 'photo') {
								goto(`/photos/${item._id}`);
							} else {
								goto(`/${item.type}/${item.alias || item._id}`);
							}
						}}
						class="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow text-left"
					>
						{#if item.thumbnailUrl}
							<img
								src={item.thumbnailUrl}
								alt={getResultTitle(item)}
								class="w-full h-32 object-cover"
							/>
						{:else}
							<div class="w-full h-32 bg-gray-200 flex items-center justify-center">
								<svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
							</div>
						{/if}
						<div class="p-3">
							<h3 class="text-sm font-medium text-gray-900 truncate">{getResultTitle(item)}</h3>
							<p class="text-xs text-gray-500 capitalize mt-1">{item.type}</p>
						</div>
					</button>
				{/each}
			</div>
		{:else if query.trim()}
			<div class="text-center py-12 px-4">
				<p class="text-gray-600">No results found for "{query}".</p>
			</div>
		{:else}
			<div class="text-center py-12 px-4">
				<p class="text-gray-600">Start typing to search...</p>
			</div>
		{/if}
	</main>
</div>

