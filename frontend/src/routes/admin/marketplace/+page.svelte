<script lang="ts">
	import { onMount } from 'svelte';
	import { productName } from '$stores/siteConfig';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { logger } from '$lib/utils/logger';

	interface Listing {
		_id: string;
		name: string;
		description: string;
		category: string;
		developerName: string;
		developerEmail: string;
		version: string;
		tags?: string[];
		featured?: boolean;
		isApproved: boolean;
		createdAt: string;
		approvedAt?: string;
		documentationUrl?: string;
		downloadUrl?: string;
		repositoryUrl?: string;
	}

	const CATEGORY_LABELS: Record<string, string> = {
		integration: 'Integration',
		tool: 'Tool',
		app: 'App',
		script: 'Script',
		theme: 'Theme',
	};

	let listings: Listing[] = [];
	let loading = true;
	let error = '';
	let filterApproved: 'all' | 'true' | 'false' = 'all';
	let togglingId: string | null = null;
	let deletingId: string | null = null;
	let editingTagsId: string | null = null;
	let tagEditValue = '';
	let savingTagsId: string | null = null;

	onMount(() => fetchListings());

	function fetchListings() {
		loading = true;
		error = '';
		const q = filterApproved !== 'all' ? `?approved=${filterApproved}` : '';
		fetch(`/api/admin/marketplace${q}`, { credentials: 'include' })
			.then((res) => {
				if (!res.ok) throw new Error('Failed to load');
				return res.json();
			})
			.then((json) => {
				listings = json.data || [];
			})
			.catch((e) => {
				logger.error('Marketplace admin load:', e);
				error = handleError(e, 'Failed to load listings');
			})
			.finally(() => { loading = false; });
	}

	async function toggleApproved(listing: Listing) {
		togglingId = listing._id;
		try {
			const res = await fetch(`/api/admin/marketplace/${listing._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isApproved: !listing.isApproved }),
				credentials: 'include',
			});
			if (!res.ok) await handleApiErrorResponse(res);
			else fetchListings();
		} catch (e) {
			logger.error('Toggle approve:', e);
			error = handleError(e, 'Failed to update');
		} finally {
			togglingId = null;
		}
	}

	async function toggleFeatured(listing: Listing) {
		togglingId = listing._id;
		try {
			const res = await fetch(`/api/admin/marketplace/${listing._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ featured: !listing.featured }),
				credentials: 'include',
			});
			if (!res.ok) await handleApiErrorResponse(res);
			else fetchListings();
		} catch (e) {
			logger.error('Toggle featured:', e);
			error = handleError(e, 'Failed to update');
		} finally {
			togglingId = null;
		}
	}

	function startEditTags(listing: Listing) {
		editingTagsId = listing._id;
		tagEditValue = (listing.tags || []).join(', ');
	}

	function cancelEditTags() {
		editingTagsId = null;
		tagEditValue = '';
	}

	async function saveTags(listing: Listing) {
		savingTagsId = listing._id;
		try {
			const tags = tagEditValue.split(',').map((t) => t.trim()).filter(Boolean);
			const res = await fetch(`/api/admin/marketplace/${listing._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tags }),
				credentials: 'include',
			});
			if (!res.ok) await handleApiErrorResponse(res);
			else {
				editingTagsId = null;
				tagEditValue = '';
				fetchListings();
			}
		} catch (e) {
			logger.error('Save tags:', e);
			error = handleError(e, 'Failed to save tags');
		} finally {
			savingTagsId = null;
		}
	}

	async function deleteListing(id: string) {
		if (!confirm('Delete this listing? This cannot be undone.')) return;
		deletingId = id;
		try {
			const res = await fetch(`/api/admin/marketplace/${id}`, {
				method: 'DELETE',
				credentials: 'include',
			});
			if (!res.ok) await handleApiErrorResponse(res);
			else fetchListings();
		} catch (e) {
			logger.error('Delete listing:', e);
			error = handleError(e, 'Failed to delete');
		} finally {
			deletingId = null;
		}
	}

</script>

<svelte:head>
	<title>Marketplace - Admin - {$productName}</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<a href="/admin" class="text-sm text-primary-600 hover:underline">← Admin</a>
			<h1 class="text-2xl font-bold text-gray-900 mt-1">Marketplace listings</h1>
			<p class="text-gray-600 text-sm">Approve or remove integration submissions.</p>
		</div>
		<div class="flex items-center gap-2">
			<select
				bind:value={filterApproved}
				on:change={fetchListings}
				class="rounded-md border border-gray-300 px-3 py-2 text-sm"
			>
				<option value="all">All</option>
				<option value="true">Approved only</option>
				<option value="false">Pending only</option>
			</select>
			<a href="/marketplace" target="_blank" rel="noopener noreferrer" class="text-sm text-primary-600 hover:underline">View public marketplace →</a>
		</div>
	</div>

	{#if error}
		<div class="rounded-md bg-red-50 p-4 text-red-700 text-sm">{error}</div>
	{/if}

	{#if loading}
		<p class="text-gray-500">Loading...</p>
	{:else if listings.length === 0}
		<div class="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-600">
			No listings match the filter.
		</div>
	{:else}
		<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-48">Tags</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Developer</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
						<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Featured</th>
						<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200">
					{#each listings as listing}
						<tr class="hover:bg-gray-50">
							<td class="px-4 py-3">
								<a href="/marketplace/{listing._id}" target="_blank" rel="noopener noreferrer" class="font-medium text-primary-600 hover:underline">{listing.name}</a>
								<p class="text-xs text-gray-500 line-clamp-1">{listing.description}</p>
							</td>
							<td class="px-4 py-3 text-sm text-gray-600">{CATEGORY_LABELS[listing.category] || listing.category}</td>
							<td class="px-4 py-3 text-sm align-top">
								{#if editingTagsId === listing._id}
									<div class="flex flex-col gap-1">
										<input
											type="text"
											bind:value={tagEditValue}
											class="w-full min-w-40 rounded border border-gray-300 px-2 py-1 text-xs"
											placeholder="comma-separated"
											disabled={savingTagsId === listing._id}
										/>
										<div class="flex gap-2">
											<button
												type="button"
												disabled={savingTagsId === listing._id}
												on:click={() => saveTags(listing)}
												class="text-xs text-primary-600 hover:underline disabled:opacity-50"
											>
												Save
											</button>
											<button
												type="button"
												disabled={savingTagsId === listing._id}
												on:click={cancelEditTags}
												class="text-xs text-gray-500 hover:underline disabled:opacity-50"
											>
												Cancel
											</button>
										</div>
									</div>
								{:else}
									<p class="text-xs text-gray-600 line-clamp-2">{listing.tags?.length ? listing.tags.join(', ') : '—'}</p>
									<button
										type="button"
										on:click={() => startEditTags(listing)}
										class="mt-1 text-xs text-primary-600 hover:underline"
									>
										Edit
									</button>
								{/if}
							</td>
							<td class="px-4 py-3 text-sm text-gray-600">{listing.developerName}</td>
							<td class="px-4 py-3">
								{#if listing.isApproved}
									<span class="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Approved</span>
								{:else}
									<span class="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Pending</span>
								{/if}
							</td>
							<td class="px-4 py-3">
								<button
									type="button"
									disabled={togglingId === listing._id}
									on:click={() => toggleFeatured(listing)}
									class="text-sm {listing.featured ? 'text-primary-600' : 'text-gray-500'} hover:underline disabled:opacity-50"
									title={listing.featured ? 'Remove from featured' : 'Set as featured'}
								>
									{listing.featured ? '★ Featured' : 'Set featured'}
								</button>
							</td>
							<td class="px-4 py-3 text-right space-x-2">
								<button
									type="button"
									disabled={togglingId === listing._id}
									on:click={() => toggleApproved(listing)}
									class="text-sm text-primary-600 hover:underline disabled:opacity-50"
								>
									{listing.isApproved ? 'Unapprove' : 'Approve'}
								</button>
								<button
									type="button"
									disabled={deletingId === listing._id}
									on:click={() => deleteListing(listing._id)}
									class="text-sm text-red-600 hover:underline disabled:opacity-50"
								>
									Delete
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
