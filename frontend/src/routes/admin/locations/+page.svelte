<script lang="ts">
	import { onMount } from 'svelte';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import type { PageData } from './$types';

	export let data: PageData;

	interface Location {
		_id: string;
		name: { en?: string; he?: string } | string;
		description?: { en?: string; he?: string } | string;
		address?: string;
		city?: string;
		state?: string;
		country?: string;
		postalCode?: string;
		coordinates?: {
			latitude: number;
			longitude: number;
		};
		placeId?: string;
		category?: string;
		isActive?: boolean;
		usageCount?: number;
	}

	const LOCATION_CATEGORIES = [
		{ value: 'city', label: 'City' },
		{ value: 'landmark', label: 'Landmark' },
		{ value: 'venue', label: 'Venue' },
		{ value: 'outdoor', label: 'Outdoor' },
		{ value: 'indoor', label: 'Indoor' },
		{ value: 'travel', label: 'Travel' },
		{ value: 'home', label: 'Home' },
		{ value: 'work', label: 'Work' },
		{ value: 'custom', label: 'Custom' }
	];

	let locations: Location[] = [];
	let loading = true;
	let saving = false;
	let deleting = false;
	let message = '';
	let error = '';
	let searchTerm = '';
	let categoryFilter = 'all';
	let showCreateDialog = false;
	let showEditDialog = false;
	let showDeleteDialog = false;
	let editingLocation: Location | null = null;
	let locationToDelete: Location | null = null;

	// Form state
	let formData = {
		name: { en: '', he: '' } as { en: string; he: string },
		description: { en: '', he: '' } as { en: string; he: string },
		address: '',
		city: '',
		state: '',
		country: '',
		postalCode: '',
		coordinates: { latitude: '', longitude: '' },
		placeId: '',
		category: 'custom',
		isActive: true
	};

	onMount(async () => {
		await loadLocations();
	});

	async function loadLocations() {
		loading = true;
		error = '';
		try {
			const params = new URLSearchParams();
			if (searchTerm) params.append('search', searchTerm);
			if (categoryFilter !== 'all') params.append('category', categoryFilter);

			const response = await fetch(`/api/admin/locations?${params.toString()}`);
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			locations = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
		} catch (err) {
			logger.error('Error loading locations:', err);
			error = handleError(err, 'Failed to load locations');
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		formData = {
			name: { en: '', he: '' },
			description: { en: '', he: '' },
			address: '',
			city: '',
			state: '',
			country: '',
			postalCode: '',
			coordinates: { latitude: '', longitude: '' },
			placeId: '',
			category: 'custom',
			isActive: true
		};
	}

	function openCreateDialog() {
		resetForm();
		showCreateDialog = true;
		error = '';
	}

	function openEditDialog(location: Location) {
		editingLocation = location;
		const nameField = typeof location.name === 'string' ? { en: location.name, he: '' } : location.name || { en: '', he: '' };
		const descField = typeof location.description === 'string'
			? { en: location.description, he: '' }
			: location.description || { en: '', he: '' };
		formData = {
			name: nameField,
			description: descField,
			address: location.address || '',
			city: location.city || '',
			state: location.state || '',
			country: location.country || '',
			postalCode: location.postalCode || '',
			coordinates: {
				latitude: location.coordinates?.latitude?.toString() || '',
				longitude: location.coordinates?.longitude?.toString() || ''
			},
			placeId: location.placeId || '',
			category: location.category || 'custom',
			isActive: location.isActive !== undefined ? location.isActive : true
		};
		showEditDialog = true;
		error = '';
	}

	function openDeleteDialog(location: Location) {
		locationToDelete = location;
		showDeleteDialog = true;
	}

	function getLocationName(location: Location): string {
		const nameField = typeof location.name === 'string' ? location.name : location.name;
		if (typeof nameField === 'string') return nameField;
		return nameField?.en || nameField?.he || '(No name)';
	}

	function getCategoryLabel(category: string): string {
		return LOCATION_CATEGORIES.find((c) => c.value === category)?.label || category;
	}

	async function handleCreate() {
		saving = true;
		error = '';
		message = '';

		try {
			logger.debug('Creating location with data:', formData);
			logger.debug('Description field:', formData.description);
			const payload: any = {
				...formData,
				coordinates:
					formData.coordinates.latitude && formData.coordinates.longitude
						? {
								latitude: formData.coordinates.latitude,
								longitude: formData.coordinates.longitude
							}
						: undefined
			};
			// Remove empty coordinate fields
			if (!payload.coordinates) delete payload.coordinates;
			logger.debug('Payload being sent:', JSON.stringify(payload, null, 2));

			const response = await fetch('/api/admin/locations', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const responseData = await response.json();
			logger.debug('Response status:', response.status, 'Response data:', responseData);

			if (!responseData) {
				throw new Error('No data returned from server');
			}

			const newLocation = responseData.data || responseData;
			locations = [...locations, newLocation];
			message = 'Location created successfully!';
			showCreateDialog = false;
			resetForm();

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			logger.error('Error creating location:', err);
			error = handleError(err, 'Failed to create location');
		} finally {
			saving = false;
		}
	}

	async function handleEdit() {
		if (!editingLocation) return;

		saving = true;
		error = '';
		message = '';

		try {
			console.log('Updating location:', editingLocation._id, 'with data:', formData);
			const payload: any = {
				...formData,
				coordinates:
					formData.coordinates.latitude && formData.coordinates.longitude
						? {
								latitude: formData.coordinates.latitude,
								longitude: formData.coordinates.longitude
							}
						: undefined
			};
			// Remove empty coordinate fields
			if (!payload.coordinates) delete payload.coordinates;

			const response = await fetch(`/api/admin/locations/${editingLocation._id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			const responseData = await response.json().catch((e) => {
				console.error('Failed to parse response:', e);
				return null;
			});

			console.log('Response status:', response.status, 'Response data:', responseData);

			if (!response.ok) {
				const errorMessage = responseData?.message || `HTTP ${response.status}: Failed to update location`;
				throw new Error(errorMessage);
			}

			if (!responseData) {
				throw new Error('No data returned from server');
			}

			const updatedLocation = responseData.data || responseData;
			locations = locations.map((l) => (l._id === editingLocation._id ? updatedLocation : l));
			message = 'Location updated successfully!';
			showEditDialog = false;
			editingLocation = null;
			resetForm();

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			console.error('Error updating location:', err);
			error = `Failed to update location: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!locationToDelete) return;

		deleting = true;
		error = '';
		message = '';

		try {
			const response = await fetch(`/api/admin/locations/${locationToDelete._id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			locations = locations.filter((l) => l._id !== locationToDelete._id);
			message = 'Location deleted successfully!';
			showDeleteDialog = false;
			locationToDelete = null;

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			logger.error('Error deleting location:', err);
			error = handleError(err, 'Failed to delete location');
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Locations Management - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Locations Management</h1>
					<p class="text-gray-600 mt-2">Manage locations for organizing your photos by place</p>
				</div>
				<a href="/admin" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
					← Back to Admin
				</a>
			</div>

			{#if message}
				<div class="mb-4 p-4 rounded-md bg-green-50 text-green-700">{message}</div>
			{/if}

			{#if error}
				<div class="mb-4 p-4 rounded-md bg-red-50 text-red-700">{error}</div>
			{/if}

			<!-- Search and Filters -->
			<div class="flex items-center justify-between mb-6">
				<div class="flex items-center space-x-4">
					<div class="relative">
						<input
							type="text"
							placeholder="Search locations..."
							bind:value={searchTerm}
							on:input={() => loadLocations()}
							class="pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
						/>
						<svg
							class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
					</div>

					<select
						bind:value={categoryFilter}
						on:change={() => loadLocations()}
						class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="all">All Categories</option>
						{#each LOCATION_CATEGORIES as cat}
							<option value={cat.value}>{cat.label}</option>
						{/each}
					</select>
				</div>

				<button
					type="button"
					on:click={openCreateDialog}
					class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					Add Location
				</button>
			</div>

			<!-- Locations List -->
			{#if loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="mt-2 text-gray-600">Loading locations...</p>
				</div>
			{:else if locations.length === 0}
				<div class="text-center py-8">
					<svg
						class="h-12 w-12 text-gray-400 mx-auto mb-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
					<h3 class="text-lg font-semibold text-gray-900 mb-2">No locations found</h3>
					<p class="text-gray-600">Start by adding your first location.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each locations as location}
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
							<div class="flex items-start justify-between mb-3">
								<div class="flex-1">
									<h3 class="font-semibold text-gray-900 mb-1">{getLocationName(location)}</h3>
									{#if location.city || location.country}
										<p class="text-sm text-gray-600">
											{#if location.city}{location.city}{/if}
											{#if location.city && location.country}, {/if}
											{#if location.country}{location.country}{/if}
										</p>
									{/if}
								</div>

								<div class="flex space-x-1">
									<button
										type="button"
										on:click={() => openEditDialog(location)}
										class="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
										aria-label="Edit location"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
									</button>
									<button
										type="button"
										on:click={() => openDeleteDialog(location)}
										class="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
										aria-label="Delete location"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								</div>
							</div>

							{#if location.address}
								<p class="text-sm text-gray-600 mb-2">{location.address}</p>
							{/if}

							<div class="flex items-center justify-between mt-3">
								<span
									class="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800"
								>
									{getCategoryLabel(location.category || 'custom')}
								</span>
								{#if location.usageCount !== undefined}
									<span class="text-xs text-gray-500">
										Used {location.usageCount} {location.usageCount === 1 ? 'time' : 'times'}
									</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Create Dialog -->
{#if showCreateDialog}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Add New Location</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<span class="block text-sm font-medium text-gray-700 mb-2">
						Location Name *
					</span>
					<MultiLangInput bind:value={formData.name} />
				</div>

				<div>
					<span class="block text-sm font-medium text-gray-700 mb-2">
						Description
					</span>
					<MultiLangHTMLEditor bind:value={formData.description} />
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="address-create" class="block text-sm font-medium text-gray-700 mb-2">
							Address
						</label>
						<input
							type="text"
							id="address-create"
							bind:value={formData.address}
							placeholder="Street address"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div>
						<label for="city-create" class="block text-sm font-medium text-gray-700 mb-2">
							City
						</label>
						<input
							type="text"
							id="city-create"
							bind:value={formData.city}
							placeholder="City"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<div class="grid grid-cols-3 gap-4">
					<div>
						<label for="state-create" class="block text-sm font-medium text-gray-700 mb-2">
							State/Province
						</label>
						<input
							type="text"
							id="state-create"
							bind:value={formData.state}
							placeholder="State"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div>
						<label for="country-create" class="block text-sm font-medium text-gray-700 mb-2">
							Country
						</label>
						<input
							type="text"
							id="country-create"
							bind:value={formData.country}
							placeholder="Country"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div>
						<label for="postal-create" class="block text-sm font-medium text-gray-700 mb-2">
							Postal Code
						</label>
						<input
							type="text"
							id="postal-create"
							bind:value={formData.postalCode}
							placeholder="Postal code"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="lat-create" class="block text-sm font-medium text-gray-700 mb-2">
							Latitude
						</label>
						<input
							type="number"
							id="lat-create"
							step="any"
							bind:value={formData.coordinates.latitude}
							placeholder="-90 to 90"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div>
						<label for="lng-create" class="block text-sm font-medium text-gray-700 mb-2">
							Longitude
						</label>
						<input
							type="number"
							id="lng-create"
							step="any"
							bind:value={formData.coordinates.longitude}
							placeholder="-180 to 180"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<div>
					<label for="place-id-create" class="block text-sm font-medium text-gray-700 mb-2">
						Place ID (Google Places)
					</label>
					<input
						type="text"
						id="place-id-create"
						bind:value={formData.placeId}
						placeholder="Optional Google Places ID"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div>
					<label for="category-create" class="block text-sm font-medium text-gray-700 mb-2">
						Category
					</label>
					<select
						id="category-create"
						bind:value={formData.category}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						{#each LOCATION_CATEGORIES as cat}
							<option value={cat.value}>{cat.label}</option>
						{/each}
					</select>
				</div>

				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							showCreateDialog = false;
							resetForm();
						}}
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleCreate}
						disabled={saving}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							Creating...
						{:else}
							Create Location
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Dialog -->
{#if showEditDialog && editingLocation}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Edit Location</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<span class="block text-sm font-medium text-gray-700 mb-2">
						Location Name *
					</span>
					<MultiLangInput bind:value={formData.name} />
				</div>

				<div>
					<span class="block text-sm font-medium text-gray-700 mb-2">
						Description
					</span>
					<MultiLangHTMLEditor bind:value={formData.description} />
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="address-edit" class="block text-sm font-medium text-gray-700 mb-2">
							Address
						</label>
						<input
							type="text"
							id="address-edit"
							bind:value={formData.address}
							placeholder="Street address"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div>
						<label for="city-edit" class="block text-sm font-medium text-gray-700 mb-2">
							City
						</label>
						<input
							type="text"
							id="city-edit"
							bind:value={formData.city}
							placeholder="City"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<div class="grid grid-cols-3 gap-4">
					<div>
						<label for="state-edit" class="block text-sm font-medium text-gray-700 mb-2">
							State/Province
						</label>
						<input
							type="text"
							id="state-edit"
							bind:value={formData.state}
							placeholder="State"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div>
						<label for="country-edit" class="block text-sm font-medium text-gray-700 mb-2">
							Country
						</label>
						<input
							type="text"
							id="country-edit"
							bind:value={formData.country}
							placeholder="Country"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div>
						<label for="postal-edit" class="block text-sm font-medium text-gray-700 mb-2">
							Postal Code
						</label>
						<input
							type="text"
							id="postal-edit"
							bind:value={formData.postalCode}
							placeholder="Postal code"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="lat-edit" class="block text-sm font-medium text-gray-700 mb-2">
							Latitude
						</label>
						<input
							type="number"
							id="lat-edit"
							step="any"
							bind:value={formData.coordinates.latitude}
							placeholder="-90 to 90"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div>
						<label for="lng-edit" class="block text-sm font-medium text-gray-700 mb-2">
							Longitude
						</label>
						<input
							type="number"
							id="lng-edit"
							step="any"
							bind:value={formData.coordinates.longitude}
							placeholder="-180 to 180"
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<div>
					<label for="place-id-edit" class="block text-sm font-medium text-gray-700 mb-2">
						Place ID (Google Places)
					</label>
					<input
						type="text"
						id="place-id-edit"
						bind:value={formData.placeId}
						placeholder="Optional Google Places ID"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div>
					<label for="category-edit" class="block text-sm font-medium text-gray-700 mb-2">
						Category
					</label>
					<select
						id="category-edit"
						bind:value={formData.category}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						{#each LOCATION_CATEGORIES as cat}
							<option value={cat.value}>{cat.label}</option>
						{/each}
					</select>
				</div>

				<div class="flex items-center">
					<label class="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.isActive}
							class="sr-only peer"
						/>
						<div
							class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
						></div>
						<span class="ml-3 text-sm font-medium text-gray-700">
							Active
						</span>
					</label>
				</div>

				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							showEditDialog = false;
							editingLocation = null;
							resetForm();
						}}
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleEdit}
						disabled={saving}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							Updating...
						{:else}
							Update Location
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Dialog -->
{#if showDeleteDialog && locationToDelete}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Delete Location</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<p class="text-gray-600">
					Are you sure you want to delete <strong>{getLocationName(locationToDelete)}</strong>? This
					action cannot be undone.
				</p>
				{#if locationToDelete.usageCount && locationToDelete.usageCount > 0}
					<div class="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
						<p class="text-sm text-yellow-800">
							⚠️ This location is used in {locationToDelete.usageCount}{' '}
							{locationToDelete.usageCount === 1 ? 'photo' : 'photos'}. Deleting it will remove
							the location from all photos.
						</p>
					</div>
				{/if}
				<div class="flex justify-end space-x-2">
					<button
						type="button"
						on:click={() => {
							showDeleteDialog = false;
							locationToDelete = null;
						}}
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleDelete}
						disabled={deleting}
						class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if deleting}
							Deleting...
						{:else}
							Delete Location
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
