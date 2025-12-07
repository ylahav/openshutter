<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import AlbumBreadcrumbs from '$lib/components/AlbumBreadcrumbs.svelte';
	import NotificationDialog from '$lib/components/NotificationDialog.svelte';

	interface Album {
		_id: string;
		name: any;
		alias: string;
		description?: any;
		isPublic: boolean;
		isFeatured: boolean;
		showExifData?: boolean;
		order: number;
		storageProvider: string;
		photoCount: number;
		level: number;
		parentPath?: string;
		createdAt: string | Date;
		updatedAt: string | Date;
		createdBy?: string;
		tags?: string[];
		people?: string[];
		location?: string | null;
	}

	let albumId: string = $page.params.id;
	let album: Album | null = null;
	let loading = true;
	let saving = false;
	let error = '';
	let notification = { show: false, message: '', type: 'success' as 'success' | 'error' };

	let formData = {
		name: {} as Record<string, string>,
		description: {} as Record<string, string>,
		isPublic: false,
		isFeatured: false,
		showExifData: true,
		order: 0,
		tags: [] as string[],
		people: [] as string[],
		location: null as string | null,
	};

	async function loadAlbum() {
		try {
			loading = true;
			error = '';
			const response = await fetch(`/api/albums/${albumId}?t=${Date.now()}`, {
				cache: 'no-store',
			});
			if (!response.ok) {
				throw new Error('Failed to fetch album');
			}
			const data = await response.json();
			album = data;
			console.log('Album loaded:', album);

			// Initialize form data
			if (album) {
				formData.name =
					typeof album.name === 'string' ? { en: album.name } : album.name || {};
				formData.description =
					typeof album.description === 'string'
						? { en: album.description }
						: album.description || {};
				formData.isPublic = album.isPublic || false;
				formData.isFeatured = album.isFeatured || false;
				formData.showExifData = album.showExifData !== undefined ? album.showExifData : true;
				formData.order = album.order || 0;
				// Convert ObjectIds to strings if needed
				formData.tags =
					album.tags?.map((tag: any) =>
						typeof tag === 'string' ? tag : tag._id?.toString() || tag.toString()
					) || [];
				formData.people =
					album.people?.map((person: any) =>
						typeof person === 'string' ? person : person._id?.toString() || person.toString()
					) || [];
				formData.location =
					album.location
						? typeof album.location === 'string'
							? album.location
							: album.location._id?.toString() || album.location.toString()
						: null;
			}
		} catch (err) {
			console.error('Failed to fetch album:', err);
			error = `Failed to load album: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!album) return;

		try {
			saving = true;
			error = '';

			const updateData = {
				name: MultiLangUtils.clean(formData.name),
				description: MultiLangUtils.clean(formData.description),
				isPublic: formData.isPublic,
				isFeatured: formData.isFeatured,
				showExifData: formData.showExifData,
				order: formData.order,
				tags: formData.tags,
				people: formData.people,
				location: formData.location,
			};

			const response = await fetch(`/api/admin/albums/${albumId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(updateData),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `Failed to update album: ${response.statusText}`);
			}

			const updatedAlbum = await response.json();
			console.log('Album updated:', updatedAlbum);

			notification = {
				show: true,
				message: 'Album updated successfully',
				type: 'success',
			};

			// Redirect after a short delay
			setTimeout(() => {
				goto(`/admin/albums/${albumId}`);
			}, 1000);
		} catch (err) {
			console.error('Failed to update album:', err);
			error = `Failed to update album: ${err instanceof Error ? err.message : 'Unknown error'}`;
			notification = {
				show: true,
				message: error,
				type: 'error',
			};
		} finally {
			saving = false;
		}
	}

	function handleInputChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const { name, type, value } = target;
		if (type === 'checkbox') {
			formData = { ...formData, [name]: target.checked };
		} else if (type === 'number') {
			formData = { ...formData, [name]: parseInt(value) || 0 };
		} else {
			formData = { ...formData, [name]: value };
		}
	}

	onMount(() => {
		loadAlbum();
	});
</script>

<svelte:head>
	<title>
		{album
			? `${MultiLangUtils.getTextValue(album.name, $currentLanguage)} - Edit Album`
			: 'Edit Album'}
		- Admin
	</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{#if loading}
			<div class="text-center py-12">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
				<p class="mt-4 text-gray-600">Loading album...</p>
			</div>
		{:else if error && !album}
			<div class="text-center py-12">
				<h1 class="text-2xl font-bold text-gray-900 mb-4">Error</h1>
				<p class="text-gray-600 mb-4">{error}</p>
				<a href="/admin/albums" class="btn-primary">Back to Albums</a>
			</div>
		{:else if album}
			<!-- Breadcrumbs -->
			<AlbumBreadcrumbs album={album} role="admin" currentPage="edit" />

			<!-- Header -->
			<div class="flex items-center justify-between mb-8">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Edit Album</h1>
					<p class="mt-2 text-gray-600">
						{MultiLangUtils.getTextValue(album.name, $currentLanguage)}
					</p>
				</div>
			</div>

			<!-- Form -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200">
				<form on:submit={handleSubmit} class="p-6 space-y-6">
					<!-- Album Info -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<span class="block text-sm font-medium text-gray-700 mb-2">
								Album Name
							</span>
							<MultiLangInput
								value={formData.name}
								onChange={(value) => {
									formData = { ...formData, name: value };
								}}
								placeholder="Enter album name..."
								required
							/>
						</div>

						<div>
							<label for="alias" class="block text-sm font-medium text-gray-700 mb-2">
								URL Alias
							</label>
							<input
								type="text"
								id="alias"
								value={album.alias}
								class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
								disabled
							/>
							<p class="text-xs text-gray-500 mt-1">URL alias cannot be changed</p>
						</div>
					</div>

					<!-- Description -->
					<div>
						<span class="block text-sm font-medium text-gray-700 mb-2">
							Description
						</span>
						<MultiLangHTMLEditor
							value={formData.description}
							onChange={(value) => {
								formData = { ...formData, description: value };
							}}
							placeholder="Enter album description..."
							height={240}
						/>
					</div>

					<!-- Album Details -->
					<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
						<div>
							<label for="order" class="block text-sm font-medium text-gray-700 mb-2">
								Display Order
							</label>
							<input
								type="number"
								id="order"
								name="order"
								value={formData.order}
								on:input={handleInputChange}
								min="0"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>

						<div>
							<label for="storage-provider" class="block text-sm font-medium text-gray-700 mb-2">
								Storage Provider
							</label>
							<input
								type="text"
								id="storage-provider"
								value={album.storageProvider}
								class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
								disabled
							/>
						</div>

						<div>
							<label for="photo-count" class="block text-sm font-medium text-gray-700 mb-2">
								Photo Count
							</label>
							<input
								type="text"
								id="photo-count"
								value={album.photoCount}
								class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
								disabled
							/>
						</div>
					</div>

					<!-- Status Toggles -->
					<div class="flex flex-wrap gap-6">
						<div class="flex items-center">
							<input
								type="checkbox"
								id="isPublic"
								name="isPublic"
								checked={formData.isPublic}
								on:change={handleInputChange}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label for="isPublic" class="ml-2 block text-sm text-gray-700">
								Public (visible to visitors)
							</label>
						</div>
						<div class="flex items-center">
							<input
								type="checkbox"
								id="isFeatured"
								name="isFeatured"
								checked={formData.isFeatured}
								on:change={handleInputChange}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label for="isFeatured" class="ml-2 block text-sm text-gray-700">
								Featured (highlighted on homepage)
							</label>
						</div>
						<div class="flex items-center">
							<input
								type="checkbox"
								id="showExifData"
								name="showExifData"
								checked={formData.showExifData}
								on:change={handleInputChange}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label for="showExifData" class="ml-2 block text-sm text-gray-700">
								Show EXIF data in photo viewer
							</label>
						</div>
					</div>

					<!-- Read-only Information -->
					<div class="bg-gray-50 rounded-lg p-4">
						<h3 class="text-sm font-medium text-gray-700 mb-3">Album Information</h3>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							<div>
								<span class="font-medium text-gray-700">Created:</span>
								<span class="ml-2 text-gray-600">
									{new Date(album.createdAt).toLocaleDateString()}
								</span>
							</div>
							<div>
								<span class="font-medium text-gray-700">Last Updated:</span>
								<span class="ml-2 text-gray-600">
									{new Date(album.updatedAt).toLocaleDateString()}
								</span>
							</div>
							<div>
								<span class="font-medium text-gray-700">Level:</span>
								<span class="ml-2 text-gray-600">{album.level}</span>
							</div>
							{#if album.parentPath}
								<div class="md:col-span-2">
									<span class="font-medium text-gray-700">Parent Path:</span>
									<span class="ml-2 text-gray-600">{album.parentPath}</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- Error Message -->
					{#if error}
						<div class="bg-red-50 border border-red-200 rounded-md p-4">
							<p class="text-sm text-red-600">{error}</p>
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
						<a
							href="/admin/albums/{albumId}"
							class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							Cancel
						</a>
						<button
							type="submit"
							disabled={saving}
							class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{saving ? 'Saving...' : 'Save Changes'}
						</button>
					</div>
				</form>
			</div>
		{/if}
	</div>
</div>

<NotificationDialog
	isOpen={notification.show}
	message={notification.message}
	type={notification.type}
	onClose={() => {
		notification.show = false;
	}}
/>
