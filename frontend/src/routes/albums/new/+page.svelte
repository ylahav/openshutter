<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	export let data; // From +layout.server.ts, contains user info

	interface AlbumFormData {
		name: string;
		alias: string;
		description: string;
		isPublic: boolean;
		isFeatured: boolean;
		storageProvider: string;
		parentAlbumId: string;
	}

	interface AlbumOption {
		_id: string;
		name: string | { en?: string; he?: string };
		alias: string;
		level: number;
		storagePath: string;
	}

	interface StorageOption {
		id: string;
		name: string;
		type: string;
		isEnabled: boolean;
	}

	let formData: AlbumFormData = {
		name: '',
		alias: '',
		description: '',
		isPublic: false,
		isFeatured: false,
		storageProvider: 'local',
		parentAlbumId: '',
	};

	let parentAlbums: AlbumOption[] = [];
	let storageOptions: StorageOption[] = [];
	let loadingStorageOptions = true;
	let isLoading = false;
	let error = '';
	let success = '';
	let storageOptionsError = '';

	onMount(async () => {
		await loadParentAlbums();
		await loadStorageOptions();
	});

	function getAlbumName(album: AlbumOption): string {
		if (typeof album.name === 'string') return album.name;
		return album.name?.en || album.name?.he || '(No name)';
	}

	async function loadParentAlbums() {
		try {
			const response = await fetch('/api/albums/hierarchy?includePrivate=true');
			if (response.ok) {
				const result = await response.json();
				console.log('[loadParentAlbums] Response:', result);
				// Handle both formats: {success: true, data: [...]} or {data: [...]}
				const albumsData = result.success ? result.data : (result.data || result);
				if (albumsData && Array.isArray(albumsData)) {
					console.log('[loadParentAlbums] Albums from API:', albumsData);

					// Flatten the tree to get all albums for parent selection
					// If user can create albums (admin/owner), they should see all albums as potential parents
					const flattenAlbums = (albums: any[]): AlbumOption[] => {
						let result: AlbumOption[] = [];
						for (const album of albums) {
							// Include all albums - users creating albums should be able to select any existing album as parent
							result.push({
								_id: album._id,
								name: album.name,
								alias: album.alias,
								level: album.level,
								storagePath: album.storagePath,
							});

							// Recursively process children
							if (album.children && album.children.length > 0) {
								result = result.concat(flattenAlbums(album.children));
							}
						}
						return result;
					};

					parentAlbums = flattenAlbums(albumsData);
					console.log('[loadParentAlbums] Final parentAlbums count:', parentAlbums.length, parentAlbums);
				} else {
					console.error('[loadParentAlbums] No albums data found in response:', result);
				}
			} else {
				console.error('[loadParentAlbums] API response not OK:', response.status, response.statusText);
			}
		} catch (err) {
			console.error('Failed to load parent albums:', err);
		}
	}

	async function loadStorageOptions() {
		try {
			loadingStorageOptions = true;
			const userRole = data?.user?.role || 'guest';

			// For owners, use the owner-specific API that respects permissions
			// For admins and others, use the admin API that shows all options
			const apiEndpoint =
				userRole === 'owner' ? '/api/owner/storage-options' : '/api/admin/storage-options';

			const response = await fetch(apiEndpoint);
			const result = await response.json();

			if (result.success && result.data) {
				storageOptions = result.data;
				// Set default storage provider to first available option
				if (result.data.length > 0) {
					formData.storageProvider = result.data[0].id;
					storageOptionsError = '';
				} else {
					storageOptions = [];
					storageOptionsError = 'No storage providers are enabled. Please configure and enable at least one storage provider in the admin panel.';
				}
			} else {
				console.error('Failed to load storage options:', result.error);
				storageOptions = [];
				storageOptionsError = 'Failed to load storage options. Please check your configuration.';
			}
		} catch (err) {
			console.error('Error loading storage options:', err);
			storageOptions = [];
			storageOptionsError = 'Error loading storage options. Please check your configuration.';
		} finally {
			loadingStorageOptions = false;
		}
	}

	function generateAlias(name: string): string {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '') // Remove special characters
			.replace(/\s+/g, '-') // Replace spaces with hyphens
			.replace(/-+/g, '-') // Replace multiple hyphens with single
			.trim();
	}

	function handleNameChange(name: string) {
		formData.name = name;
		formData.alias = generateAlias(name);
	}

	function getParentDisplayName(album: AlbumOption): string {
		const indent = '  '.repeat(album.level);
		return `${indent}${getAlbumName(album)} (${album.storagePath})`;
	}

	function getStoragePathPreview(): string {
		if (!formData.parentAlbumId) {
			return `/${formData.alias}`;
		}
		const parent = parentAlbums.find((a) => a._id === formData.parentAlbumId);
		if (parent) {
			return `${parent.storagePath}/${formData.alias}`;
		}
		return `/${formData.alias}`;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		success = '';

		if (!formData.name || !formData.alias) {
			error = 'Name and alias are required';
			return;
		}

		isLoading = true;

		try {
			const response = await fetch('/api/albums', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			});

			console.log('[handleSubmit] Response status:', response.status, response.ok);
			if (response.ok) {
				const result = await response.json();
				console.log('[handleSubmit] Response data:', result);
				console.log('[handleSubmit] result.success:', result.success);
				console.log('[handleSubmit] result.data:', result.data);
				
				if (result.success && result.data) {
					success = 'Album created successfully!';
					setTimeout(() => {
						// Determine redirect destination based on user role
						const userRole = data?.user?.role;
						
						console.log('[handleSubmit] User data:', { 
							role: userRole, 
							user: data?.user,
							fullData: data
						});
						
						// Default to owner albums, but check for admin role explicitly
						let dest = '/owner/albums';
						if (userRole === 'admin') {
							dest = '/admin/albums';
							console.log('[handleSubmit] Admin user detected, redirecting to admin albums');
						} else {
							console.log('[handleSubmit] Non-admin user, redirecting to owner albums');
						}
						
						console.log('[handleSubmit] Redirecting to:', dest);
						goto(dest);
					}, 1500);
				} else {
					console.error('[handleSubmit] Response missing success or data:', result);
					error = result.error || 'Failed to create album - invalid response format';
				}
			} else {
				const errorData = await response.json().catch(() => ({}));
				console.error('[handleSubmit] Response not OK:', response.status, errorData);
				error = errorData.error || errorData.message || `Failed to create album (HTTP ${response.status})`;
			}
		} catch (err) {
			console.error('Failed to create album:', err);
			error = `Failed to create album: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Create New Album</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-4xl mx-auto px-4">
		<!-- Header -->
		<div class="mb-8">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Create New Album</h1>
					<p class="mt-2 text-gray-600">
						Create a new album with hierarchical organization and storage provider selection.
					</p>
				</div>
				<a href="/albums" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
					Back to Albums
				</a>
			</div>
		</div>

		<!-- Error/Success Messages -->
		{#if error}
			<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800">Error</h3>
						<div class="mt-2 text-sm text-red-700">{error}</div>
					</div>
				</div>
			</div>
		{/if}

		{#if success}
			<div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-3">
						<h3 class="text-sm font-medium text-green-800">Success</h3>
						<div class="mt-2 text-sm text-green-700">{success}</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Album Creation Form -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<form on:submit|preventDefault={handleSubmit} class="space-y-6">
				<!-- Basic Information -->
				<div>
					<h3 class="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label for="name" class="block text-sm font-medium text-gray-700 mb-2">
								Album Name *
							</label>
							<input
								type="text"
								id="name"
								bind:value={formData.name}
								on:input={(e) => handleNameChange(e.currentTarget.value)}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="Enter album name"
								required
							/>
						</div>
						<div>
							<label for="alias" class="block text-sm font-medium text-gray-700 mb-2">
								Album Alias *
							</label>
							<input
								type="text"
								id="alias"
								bind:value={formData.alias}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="URL-friendly name"
								required
							/>
							<p class="mt-1 text-xs text-gray-500">
								This will be used in the folder structure and URLs
							</p>
						</div>
					</div>
					<div class="mt-4">
						<label for="description" class="block text-sm font-medium text-gray-700 mb-2">
							Description
						</label>
						<textarea
							id="description"
							bind:value={formData.description}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							rows="3"
							placeholder="Describe your album"
						></textarea>
					</div>
				</div>

				<!-- Storage Configuration -->
				<div>
					<h3 class="text-lg font-medium text-gray-900 mb-4">Storage Configuration</h3>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label for="storageProvider" class="block text-sm font-medium text-gray-700 mb-2">
								Storage Provider *
							</label>
							{#if loadingStorageOptions}
								<div
									class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center"
								>
									<svg
										class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										></circle>
										<path
											class="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									Loading storage options...
								</div>
							{:else if storageOptions.length === 0}
								<div
									class="w-full px-3 py-2 border border-yellow-300 rounded-md bg-yellow-50 text-yellow-800"
								>
									<p class="text-sm font-medium">No storage providers available</p>
									<p class="text-xs mt-1">
										{storageOptionsError || 'Please configure and enable at least one storage provider in the admin panel.'}
									</p>
									<a
										href="/admin/storage"
										class="text-xs text-yellow-700 underline hover:text-yellow-900 mt-2 inline-block"
									>
										Go to Storage Settings →
									</a>
								</div>
							{:else}
								<select
									id="storageProvider"
									bind:value={formData.storageProvider}
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									required
								>
									{#each storageOptions as option}
										<option value={option.id}>{option.name}</option>
									{/each}
								</select>
							{/if}
							{#if storageOptions.length > 0}
								<p class="mt-1 text-xs text-gray-500">Where photos will be stored</p>
							{/if}
						</div>
						<div>
							<label for="parentAlbumId" class="block text-sm font-medium text-gray-700 mb-2">
								Parent Album
							</label>
							<select
								id="parentAlbumId"
								bind:value={formData.parentAlbumId}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="">No Parent (Root Level)</option>
								{#each parentAlbums as album}
									<option value={album._id}>{getParentDisplayName(album)}</option>
								{/each}
							</select>
							<p class="mt-1 text-xs text-gray-500">Select parent album for hierarchy</p>
						</div>
					</div>
				</div>

				<!-- Folder Structure Preview -->
				{#if formData.parentAlbumId}
					<div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
						<h4 class="text-sm font-medium text-blue-900 mb-2">📁 Folder Structure Preview</h4>
						<div class="text-sm text-blue-800">
							<p><strong>Storage Path:</strong></p>
							<div class="font-mono bg-white p-2 rounded border mt-1">
								{getStoragePathPreview()}
							</div>
						</div>
					</div>
				{/if}

				<!-- Album Settings -->
				<div>
					<h3 class="text-lg font-medium text-gray-900 mb-4">Album Settings</h3>
					<div class="space-y-4">
						<div class="flex items-center">
							<input
								type="checkbox"
								id="isPublic"
								bind:checked={formData.isPublic}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label for="isPublic" class="ml-2 block text-sm text-gray-900">
								Public Album
							</label>
							<p class="ml-2 text-sm text-gray-500">Visible to all users</p>
						</div>
						<div class="flex items-center">
							<input
								type="checkbox"
								id="isFeatured"
								bind:checked={formData.isFeatured}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label for="isFeatured" class="ml-2 block text-sm text-gray-900">
								Featured Album
							</label>
							<p class="ml-2 text-sm text-gray-500">Highlighted on the home page</p>
						</div>
					</div>
				</div>

				<!-- Submit Button -->
				<div class="flex justify-end space-x-3">
					<a
						href="/albums"
						class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
					>
						Cancel
					</a>
					<button
						type="submit"
						disabled={isLoading}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? 'Creating...' : 'Create Album'}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
