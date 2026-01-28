<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';

	export let isOpen = false;
	export let onClose: () => void;
	export let title = 'Select Items';
	export let collectionType: 'tags' | 'people' | 'locations' = 'tags';
	export let selectedItems: string[] = [];
	export let onSelectionChange: (items: string[]) => void;
	export let searchPlaceholder = 'Search...';

	interface TagItem {
		_id: string;
		name: string;
		color?: string;
	}

	interface PersonItem {
		_id: string;
		fullName?: string | { en?: string; he?: string };
		firstName?: string | { en?: string; he?: string };
		lastName?: string | { en?: string; he?: string };
	}

	interface LocationItem {
		_id: string;
		name: string | { en?: string; he?: string };
		address?: string;
	}

	type CollectionItem = TagItem | PersonItem | LocationItem;

	let searchQuery = '';
	let items: CollectionItem[] = [];
	let loading = false;
	let error: string | null = null;
	let newItemName = '';
	let isCreating = false;

	$: displayItems = items.filter((item) => {
		if (!searchQuery) return true;
		const query = searchQuery.toLowerCase();
		
		if (collectionType === 'tags') {
			const name = typeof item.name === 'string' ? item.name : '';
			return name.toLowerCase().includes(query);
		} else if (collectionType === 'people') {
			const fullName = MultiLangUtils.getTextValue(item.fullName || item.firstName || {}, $currentLanguage) || '';
			return fullName.toLowerCase().includes(query);
		} else if (collectionType === 'locations') {
			const name = MultiLangUtils.getTextValue(item.name || {}, $currentLanguage) || '';
			return name.toLowerCase().includes(query);
		}
		return false;
	});

	async function fetchItems() {
		try {
			loading = true;
			error = null;
			const endpoint = `/api/admin/${collectionType}?limit=1000${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`;
			const response = await fetch(endpoint);
			
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			
			const result = await response.json();
			if (result.data) {
				items = result.data || [];
			} else {
				items = result || [];
			}
		} catch (err) {
			logger.error(`Error fetching ${collectionType}:`, err);
			error = handleError(err, `Failed to fetch ${collectionType}`);
		} finally {
			loading = false;
		}
	}

	async function createItem() {
		if (!newItemName.trim()) return;

		try {
			isCreating = true;
			error = null;

			let requestBody: any = {};

			if (collectionType === 'tags') {
				requestBody = {
					name: newItemName.trim(),
					color: '#3B82F6'
				};
			} else if (collectionType === 'people') {
				const trimmedName = newItemName.trim();
				const nameParts = trimmedName.split(/\s+/);
				let firstName = trimmedName;
				let lastName = trimmedName;
				
				if (nameParts.length > 1) {
					firstName = nameParts[0];
					lastName = nameParts.slice(1).join(' ');
				}
				
				requestBody = {
					firstName: { en: firstName, he: '' },
					lastName: { en: lastName, he: '' },
				};
			} else if (collectionType === 'locations') {
				requestBody = {
					name: { en: newItemName.trim(), he: '' }
				};
			}

			const response = await fetch(`/api/admin/${collectionType}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(requestBody),
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const result = await response.json();
			if (result.success || result._id) {
				await fetchItems();
				newItemName = '';
				// Auto-select the newly created item
				const newId = result._id || result.data?._id;
				if (newId) {
					onSelectionChange([...selectedItems, newId.toString()]);
				}
			} else {
				throw new Error(result.error || `Failed to create ${collectionType.slice(0, -1)}`);
			}
		} catch (err) {
			logger.error(`Error creating ${collectionType.slice(0, -1)}:`, err);
			error = handleError(err, `Failed to create ${collectionType.slice(0, -1)}`);
		} finally {
			isCreating = false;
		}
	}

	function toggleItem(item: any) {
		const itemId = item._id?.toString() || item._id;
		if (!itemId) return;

		// For locations (single-select), toggle behavior: select new item and deselect previous
		if (collectionType === 'locations') {
			const currentSelected = [...selectedItems];
			const isCurrentlySelected = currentSelected.some(id => String(id) === String(itemId));
			
			if (isCurrentlySelected) {
				// Deselect if clicking the same item
				onSelectionChange([]);
			} else {
				// Select new item (replaces previous selection)
				onSelectionChange([itemId]);
			}
		} else {
			// For tags and people (multi-select), toggle behavior
			const currentSelected = [...selectedItems];
			const isCurrentlySelected = currentSelected.some(id => String(id) === String(itemId));
			
			if (isCurrentlySelected) {
				onSelectionChange(currentSelected.filter((id) => String(id) !== String(itemId)));
			} else {
				onSelectionChange([...currentSelected, itemId]);
			}
		}
	}

	function getItemName(item: CollectionItem): string {
		if (collectionType === 'tags') {
			return typeof item.name === 'string' ? item.name : '';
		} else if (collectionType === 'people') {
			return MultiLangUtils.getTextValue(item.fullName || item.firstName || {}, $currentLanguage) || 'Unknown';
		} else if (collectionType === 'locations') {
			return MultiLangUtils.getTextValue(item.name || {}, $currentLanguage) || 'Unknown';
		}
		return 'Unknown';
	}

	function isSelected(item: CollectionItem): boolean {
		const itemId = item._id?.toString() || item._id;
		if (!itemId) return false;
		// Explicitly check if the itemId is in selectedItems
		// Access selectedItems to make this reactive
		const items = selectedItems;
		return items.some(id => String(id) === String(itemId));
	}

	// Force reactivity when selectedItems changes
	$: selectedItemsCount = selectedItems.length;
	$: selectedItems; // Track changes to selectedItems

	// Fetch items when popup opens (only once when it changes from false to true)
	let hasFetched = false;
	$: if (isOpen && !hasFetched) {
		hasFetched = true;
		fetchItems();
	} else if (!isOpen && hasFetched) {
		hasFetched = false;
	}

	// Close on escape key
	let escapeHandler: ((e: KeyboardEvent) => void) | null = null;
	
	$: if (isOpen && typeof window !== 'undefined') {
		if (escapeHandler) {
			window.removeEventListener('keydown', escapeHandler);
		}
		escapeHandler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};
		window.addEventListener('keydown', escapeHandler);
	} else if (escapeHandler && typeof window !== 'undefined') {
		window.removeEventListener('keydown', escapeHandler);
		escapeHandler = null;
	}
	
	onDestroy(() => {
		if (escapeHandler && typeof window !== 'undefined') {
			window.removeEventListener('keydown', escapeHandler);
		}
	});
</script>

{#if isOpen}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black bg-opacity-50 z-[99]"
		on:click={onClose}
		on:keydown={(e) => e.key === 'Escape' && onClose()}
		role="button"
		tabindex="-1"
		style="pointer-events: auto;"
	></div>

	<!-- Popup -->
	<div
		class="fixed inset-0 z-[100] flex items-center justify-center p-4"
		on:click|stopPropagation
		style="pointer-events: none;"
	>
		<div
			class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
			on:click|stopPropagation
			style="pointer-events: auto;"
		>
			<!-- Header -->
			<div class="flex items-center justify-between p-4 border-b border-gray-200">
				<div class="flex-1">
					<h2 class="text-lg font-semibold text-gray-900">{title}</h2>
					{#if selectedItems.length > 0}
						{#if collectionType === 'locations'}
							{@const selectedLocation = items.find(item => {
								const itemId = item._id?.toString() || item._id;
								return itemId && selectedItems.some(id => String(id) === String(itemId));
							})}
							{#if selectedLocation}
								<p class="text-sm text-gray-500 mt-1">
									Selected: <span class="font-medium text-gray-700">{getItemName(selectedLocation)}</span>
								</p>
							{/if}
						{:else}
							<p class="text-sm text-gray-500 mt-1">
								{selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} selected
							</p>
						{/if}
					{/if}
				</div>
				<button
					type="button"
					on:click={onClose}
					class="text-gray-400 hover:text-gray-600"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Search and Create -->
			<div class="p-4 border-b border-gray-200 space-y-2">
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={searchQuery}
						placeholder={searchPlaceholder}
						class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<button
						type="button"
						on:click={fetchItems}
						class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
					>
						Search
					</button>
				</div>
				<div class="flex gap-2">
					<input
						type="text"
						bind:value={newItemName}
						placeholder={`Create new ${collectionType.slice(0, -1)}...`}
						on:keydown={(e) => e.key === 'Enter' && createItem()}
						class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
					<button
						type="button"
						on:click={createItem}
						disabled={isCreating || !newItemName.trim()}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isCreating ? 'Creating...' : 'Create'}
					</button>
				</div>
			</div>

			<!-- Error Message -->
			{#if error}
				<div class="px-4 py-2 bg-red-50 border-b border-red-200">
					<p class="text-sm text-red-600">{error}</p>
				</div>
			{/if}

			<!-- Items List -->
			<div class="flex-1 overflow-y-auto p-4">
				{#if loading}
					<div class="text-center py-8">
						<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
						<p class="mt-2 text-gray-600">Loading...</p>
					</div>
				{:else if displayItems.length === 0}
					<div class="text-center py-8 text-gray-500">
						No {collectionType} found
					</div>
				{:else}
					<div class="space-y-1">
						{#each displayItems as item (item._id)}
							{@const itemId = item._id?.toString() || item._id}
							<button
								type="button"
								on:click|preventDefault|stopPropagation={(e) => {
									e.stopPropagation();
									e.preventDefault();
									toggleItem(item);
								}}
								class="w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 flex items-center justify-between cursor-pointer {isSelected(item)
									? 'bg-blue-50 border border-blue-200'
									: 'border border-transparent'}"
							>
								<span class="flex-1">{getItemName(item)}</span>
								{#if isSelected(item)}
									<svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
											clip-rule="evenodd"
										/>
									</svg>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
				<button
					type="button"
					on:click={onClose}
					class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
				>
					Done
				</button>
			</div>
		</div>
	</div>
{/if}
