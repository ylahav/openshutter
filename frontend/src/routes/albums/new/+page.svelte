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
				if (result.success) {
					const userRole = data?.user?.role || 'guest';
					const userId = data?.user?.id;

					// Flatten the tree to get all albums for parent selection
					const flattenAlbums = (albums: any[]): AlbumOption[] => {
						let result: AlbumOption[] = [];
						for (const album of albums) {
							// For owners, only include albums they created
							// For admins, include all albums
							if (userRole === 'admin' || (userRole === 'owner' && album.createdBy === userId)) {
								result.push({
									_id: album._id,
									name: album.name,
									alias: album.alias,
									level: album.level,
									storagePath: album.storagePath,
								});
							}

							if (album.children && album.children.length > 0) {
								result = result.concat(flattenAlbums(album.children));
							}
						}
						return result;
					};

					parentAlbums = flattenAlbums(result.data);
				}
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

			if (result.success) {
				storageOptions = result.data;
				// Set default storage provider to first available option
				if (result.data.length > 0) {
					formData.storageProvider = result.data[0].id;
				}
			} else {
				console.error('Failed to load storage options:', result.error);
				// Fallback to local storage
				storageOptions = [
					{
						id: 'local',
						name: 'Local Storage',
						type: 'local',
						isEnabled: true,
					},
				];
			}
		} catch (err) {
			console.error('Error loading storage options:', err);
			// Fallback to local storage
			storageOptions = [
				{
					id: 'local',
					name: 'Local Storage',
					type: 'local',
					isEnabled: true,
				},
			];
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

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					success = 'Album created successfully!';
					setTimeout(() => {
						const role = data?.user?.role || 'guest';
						const dest =
							role === 'admin'
								? `/admin/albums/${result.data._id}/edit`
								: '/owner/albums';
						goto(dest);
					}, 1500);
				} else {
					error = result.error || 'Failed to create album';
				}
			} else {
				const errorData = await response.json().catch(() => ({}));
				error = errorData.error || 'Failed to create album';
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
							<p class="mt-1 text-xs text-gray-500">Where photos will be stored</p>
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
