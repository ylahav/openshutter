<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import type { MultiLangText } from '$lib/types/multi-lang';

	export let data; // From +layout.server.ts, contains user info

	interface Tag {
		_id: string;
		name: string | MultiLangText;
		description?: string | MultiLangText;
		color?: string;
		category?: string;
		isActive?: boolean;
		usageCount?: number;
	}

	const TAG_CATEGORIES = [
		{ value: 'general', label: 'General' },
		{ value: 'location', label: 'Location' },
		{ value: 'event', label: 'Event' },
		{ value: 'object', label: 'Object' },
		{ value: 'mood', label: 'Mood' },
		{ value: 'technical', label: 'Technical' },
		{ value: 'custom', label: 'Custom' }
	];

	const COLOR_PRESETS = [
		'#3B82F6',
		'#EF4444',
		'#10B981',
		'#F59E0B',
		'#8B5CF6',
		'#EC4899',
		'#06B6D4',
		'#84CC16',
		'#F97316',
		'#6366F1'
	];

	let tags: Tag[] = [];
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
	let editingTag: Tag | null = null;
	let tagToDelete: Tag | null = null;

	// Form state
	let formData = {
		name: { en: '', he: '' } as MultiLangText,
		description: { en: '', he: '' } as MultiLangText,
		color: '#3B82F6',
		category: 'general',
		isActive: true
	};

	onMount(async () => {
		await loadTags();
	});

	async function loadTags() {
		loading = true;
		error = '';
		try {
			const params = new URLSearchParams();
			if (searchTerm) params.append('search', searchTerm);
			if (categoryFilter !== 'all') params.append('category', categoryFilter);

			const response = await fetch(`/api/admin/tags?${params.toString()}`);
			if (!response.ok) {
				throw new Error('Failed to load tags');
			}
			const result = await response.json();
			tags = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
		} catch (err) {
			console.error('Error loading tags:', err);
			error = `Failed to load tags: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		formData = {
			name: { en: '', he: '' } as MultiLangText,
			description: { en: '', he: '' } as MultiLangText,
			color: '#3B82F6',
			category: 'general',
			isActive: true
		};
	}

	function openCreateDialog() {
		resetForm();
		showCreateDialog = true;
		error = '';
	}

	function openEditDialog(tag: Tag) {
		editingTag = tag;
		// Convert string to MultiLangText if needed (backward compatibility)
		const nameField =
			typeof tag.name === 'string' ? { en: tag.name, he: '' } : tag.name || { en: '', he: '' };
		const descriptionField =
			typeof tag.description === 'string'
				? { en: tag.description, he: '' }
				: tag.description || { en: '', he: '' };
		formData = {
			name: nameField,
			description: descriptionField,
			color: tag.color || '#3B82F6',
			category: tag.category || 'general',
			isActive: tag.isActive !== undefined ? tag.isActive : true
		};
		showEditDialog = true;
		error = '';
	}

	function openDeleteDialog(tag: Tag) {
		tagToDelete = tag;
		showDeleteDialog = true;
	}

	async function handleCreate() {
		saving = true;
		error = '';
		message = '';

		try {
			console.log('Creating tag with data:', formData);
			const response = await fetch('/api/admin/tags', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: MultiLangUtils.clean(formData.name),
					description: MultiLangUtils.clean(formData.description),
					color: formData.color,
					category: formData.category,
					isActive: formData.isActive
				})
			});

			const responseData = await response.json().catch((e) => {
				console.error('Failed to parse response:', e);
				return null;
			});

			console.log('Response status:', response.status, 'Response data:', responseData);

			if (!response.ok) {
				const errorMessage = responseData?.message || `HTTP ${response.status}: Failed to create tag`;
				throw new Error(errorMessage);
			}

			if (!responseData) {
				throw new Error('No data returned from server');
			}

			// Handle both direct tag object and wrapped response
			const newTag = responseData.data || responseData;
			tags = [...tags, newTag];
			message = 'Tag created successfully!';
			showCreateDialog = false;
			resetForm();

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			console.error('Error creating tag:', err);
			error = `Failed to create tag: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			saving = false;
		}
	}

	async function handleEdit() {
		if (!editingTag) return;

		saving = true;
		error = '';
		message = '';

		try {
			console.log('Updating tag:', editingTag._id, 'with data:', formData);
			const response = await fetch(`/api/admin/tags/${editingTag._id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: MultiLangUtils.clean(formData.name),
					description: MultiLangUtils.clean(formData.description),
					color: formData.color,
					category: formData.category,
					isActive: formData.isActive
				})
			});

			const responseData = await response.json().catch((e) => {
				console.error('Failed to parse response:', e);
				return null;
			});

			console.log('Response status:', response.status, 'Response data:', responseData);

			if (!response.ok) {
				const errorMessage = responseData?.message || `HTTP ${response.status}: Failed to update tag`;
				throw new Error(errorMessage);
			}

			if (!responseData) {
				throw new Error('No data returned from server');
			}

			// Handle both direct tag object and wrapped response
			const updatedTag = responseData.data || responseData;
			tags = tags.map((t) => (t._id === editingTag._id ? updatedTag : t));
			message = 'Tag updated successfully!';
			showEditDialog = false;
			editingTag = null;
			resetForm();

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			console.error('Error updating tag:', err);
			error = `Failed to update tag: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!tagToDelete) return;

		deleting = true;
		error = '';
		message = '';

		try {
			const response = await fetch(`/api/admin/tags/${tagToDelete._id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Failed to delete tag');
			}

			tags = tags.filter((t) => t._id !== tagToDelete._id);
			message = 'Tag deleted successfully!';
			showDeleteDialog = false;
			tagToDelete = null;

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			console.error('Error deleting tag:', err);
			error = `Failed to delete tag: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			deleting = false;
		}
	}

	function getCategoryLabel(category: string): string {
		return TAG_CATEGORIES.find((c) => c.value === category)?.label || category;
	}

	function getTagName(tag: Tag): string {
		if (typeof tag.name === 'string') return tag.name;
		return MultiLangUtils.getTextValue(tag.name) || tag._id;
	}

	function getTagDescription(tag: Tag): string {
		if (!tag.description) return '';
		if (typeof tag.description === 'string') return tag.description;
		return MultiLangUtils.getTextValue(tag.description) || '';
	}
</script>

<svelte:head>
	<title>Tags Management - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Tags Management</h1>
					<p class="text-gray-600 mt-2">Manage tags for categorizing and organizing your photos</p>
				</div>
				<a
					href="/admin"
					class="text-blue-600 hover:text-blue-800 text-sm font-medium"
				>
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
							placeholder="Search tags..."
							bind:value={searchTerm}
							on:input={() => loadTags()}
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
						on:change={() => loadTags()}
						class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="all">All Categories</option>
						{#each TAG_CATEGORIES as cat}
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
					Add Tag
				</button>
			</div>

			<!-- Tags List -->
			{#if loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="mt-2 text-gray-600">Loading tags...</p>
				</div>
			{:else if tags.length === 0}
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
							d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
						/>
					</svg>
					<h3 class="text-lg font-semibold text-gray-900 mb-2">No tags found</h3>
					<p class="text-gray-600">Start by adding your first tag.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each tags as tag}
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
							<div class="flex items-start justify-between mb-3">
								<div class="flex items-center space-x-2 flex-1">
									<div
										class="w-4 h-4 rounded-full border border-gray-300"
										style="background-color: {tag.color || '#3B82F6'}"
									></div>
									<h3 class="font-semibold text-gray-900">{getTagName(tag)}</h3>
								</div>

								<div class="flex space-x-1">
									<button
										type="button"
										on:click={() => openEditDialog(tag)}
										class="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
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
										on:click={() => openDeleteDialog(tag)}
										class="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
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

							{#if getTagDescription(tag)}
								<p class="text-sm text-gray-600 mb-2">{getTagDescription(tag)}</p>
							{/if}

							<div class="flex items-center justify-between mt-3">
								<span
									class="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800"
								>
									{getCategoryLabel(tag.category || 'general')}
								</span>
								{#if tag.usageCount !== undefined}
									<span class="text-xs text-gray-500">
										Used {tag.usageCount} {tag.usageCount === 1 ? 'time' : 'times'}
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
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Add New Tag</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Tag Name *
					</label>
					<MultiLangInput
						bind:value={formData.name}
						placeholder="e.g., Family, Vacation, Nature"
						required
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Description
					</label>
					<MultiLangInput
						bind:value={formData.description}
						placeholder="Optional description..."
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Category
					</label>
					<select
						bind:value={formData.category}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						{#each TAG_CATEGORIES as cat}
							<option value={cat.value}>{cat.label}</option>
						{/each}
					</select>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Color
					</label>
					<div class="flex items-center gap-3">
						<input
							type="color"
							bind:value={formData.color}
							class="w-16 h-10 border border-gray-300 rounded cursor-pointer"
						/>
						<input
							type="text"
							bind:value={formData.color}
							placeholder="#3B82F6"
							class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
					<div class="flex flex-wrap gap-2 mt-2">
						{#each COLOR_PRESETS as preset}
							<button
								type="button"
								on:click={() => (formData.color = preset)}
								class="w-8 h-8 rounded border-2 {formData.color === preset
									? 'border-gray-800'
									: 'border-gray-300'} hover:border-gray-500"
								style="background-color: {preset}"
							></button>
						{/each}
					</div>
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
						disabled={saving || !MultiLangUtils.hasContent(formData.name)}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							Creating...
						{:else}
							Create Tag
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Dialog -->
{#if showEditDialog && editingTag}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Edit Tag</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Tag Name *
					</label>
					<MultiLangInput
						bind:value={formData.name}
						placeholder="e.g., Family, Vacation, Nature"
						required
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Description
					</label>
					<MultiLangInput
						bind:value={formData.description}
						placeholder="Optional description..."
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Category
					</label>
					<select
						bind:value={formData.category}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						{#each TAG_CATEGORIES as cat}
							<option value={cat.value}>{cat.label}</option>
						{/each}
					</select>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Color
					</label>
					<div class="flex items-center gap-3">
						<input
							type="color"
							bind:value={formData.color}
							class="w-16 h-10 border border-gray-300 rounded cursor-pointer"
						/>
						<input
							type="text"
							bind:value={formData.color}
							placeholder="#3B82F6"
							class="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
					<div class="flex flex-wrap gap-2 mt-2">
						{#each COLOR_PRESETS as preset}
							<button
								type="button"
								on:click={() => (formData.color = preset)}
								class="w-8 h-8 rounded border-2 {formData.color === preset
									? 'border-gray-800'
									: 'border-gray-300'} hover:border-gray-500"
								style="background-color: {preset}"
							></button>
						{/each}
					</div>
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
							editingTag = null;
							resetForm();
						}}
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleEdit}
						disabled={saving || !MultiLangUtils.hasContent(formData.name)}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							Updating...
						{:else}
							Update Tag
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Dialog -->
{#if showDeleteDialog && tagToDelete}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Delete Tag</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<p class="text-gray-600">
					Are you sure you want to delete <strong>{tagToDelete.name}</strong>? This action
					cannot be undone.
				</p>
				{#if tagToDelete.usageCount && tagToDelete.usageCount > 0}
					<div class="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
						<p class="text-sm text-yellow-800">
							⚠️ This tag is used in {tagToDelete.usageCount}{' '}
							{tagToDelete.usageCount === 1 ? 'photo' : 'photos'}. Deleting it will remove
							the tag from all photos.
						</p>
					</div>
				{/if}
				<div class="flex justify-end space-x-2">
					<button
						type="button"
						on:click={() => {
							showDeleteDialog = false;
							tagToDelete = null;
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
							Delete Tag
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
