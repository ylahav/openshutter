<script lang="ts">
	import { onMount } from 'svelte';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import type { MultiLangText } from '$lib/types/multi-lang';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';

  export const data = undefined as any; // From +layout.server.ts, not used in this component

	interface BlogCategory {
		_id: string;
		alias: string;
		title: MultiLangText | string;
		description?: MultiLangText | string;
		leadingImage?: {
			url: string;
			alt?: MultiLangText | string;
			storageProvider?: string;
			storagePath?: string;
		};
		isActive?: boolean;
		sortOrder?: number;
		createdAt?: string;
		updatedAt?: string;
	}

	let categories: BlogCategory[] = [];
	let loading = true;
	let saving = false;
	let deleting = false;
	let message = '';
	let error = '';
	let searchTerm = '';
	let activeFilter = 'all';
	let showCreateDialog = false;
	let showEditDialog = false;
	let showDeleteDialog = false;
	let editingCategory: BlogCategory | null = null;
	let categoryToDelete: BlogCategory | null = null;

	// Form state
	let formData = {
		alias: '',
		title: { en: '', he: '' } as MultiLangText,
		description: { en: '', he: '' } as MultiLangText,
		leadingImage: {
			url: '',
			alt: { en: '', he: '' } as MultiLangText,
			storageProvider: '',
			storagePath: ''
		},
		isActive: true,
		sortOrder: 0
	};

	onMount(async () => {
		await loadCategories();
	});

	async function loadCategories() {
		loading = true;
		error = '';
		try {
			const params = new URLSearchParams();
			if (searchTerm) params.append('q', searchTerm);
			if (activeFilter !== 'all') params.append('isActive', activeFilter);

			const response = await fetch(`/api/admin/blog-categories?${params.toString()}`);
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			categories = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
		} catch (err) {
			logger.error('Error loading blog categories:', err);
			error = handleError(err, 'Failed to load blog categories');
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		formData = {
			alias: '',
			title: { en: '', he: '' },
			description: { en: '', he: '' },
			leadingImage: {
				url: '',
				alt: { en: '', he: '' },
				storageProvider: '',
				storagePath: ''
			},
			isActive: true,
			sortOrder: 0
		};
	}

	function openCreateDialog() {
		resetForm();
		showCreateDialog = true;
		error = '';
	}

	function openEditDialog(category: BlogCategory) {
		editingCategory = category;
		const titleField = typeof category.title === 'string' ? { en: category.title, he: '' } : category.title || { en: '', he: '' };
		const descField = typeof category.description === 'string'
			? { en: category.description, he: '' }
			: category.description || { en: '', he: '' };
		formData = {
			alias: category.alias || '',
			title: titleField,
			description: descField,
			leadingImage: category.leadingImage || {
				url: '',
				alt: { en: '', he: '' },
				storageProvider: '',
				storagePath: ''
			},
			isActive: category.isActive !== undefined ? category.isActive : true,
			sortOrder: category.sortOrder || 0
		};
		showEditDialog = true;
		error = '';
	}

	function openDeleteDialog(category: BlogCategory) {
		categoryToDelete = category;
		showDeleteDialog = true;
	}

	function getCategoryTitle(category: BlogCategory): string {
		const titleField = typeof category.title === 'string' ? category.title : category.title;
		if (typeof titleField === 'string') return titleField;
		return titleField?.en || titleField?.he || category.alias || '(No title)';
	}

	async function handleCreate() {
		saving = true;
		error = '';
		message = '';

		try {
			const payload: any = {
				title: formData.title,
				description: formData.description,
				isActive: formData.isActive,
				sortOrder: formData.sortOrder
			};
			if (formData.alias.trim()) payload.alias = formData.alias.trim();
			if (formData.leadingImage.url.trim()) {
				payload.leadingImage = formData.leadingImage;
			}

			const response = await fetch('/api/admin/blog-categories', {
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

			if (!responseData) {
				throw new Error('No data returned from server');
			}

			const newCategory = responseData.data || responseData;
			categories = [...categories, newCategory];
			message = 'Blog category created successfully!';
			showCreateDialog = false;
			resetForm();

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			logger.error('Error creating blog category:', err);
			error = handleError(err, 'Failed to create blog category');
		} finally {
			saving = false;
		}
	}

	async function handleEdit() {
		if (!editingCategory) return;

		saving = true;
		error = '';
		message = '';

		try {
			const payload: any = {
				title: formData.title,
				description: formData.description,
				isActive: formData.isActive,
				sortOrder: formData.sortOrder
			};
			if (formData.alias.trim() && formData.alias !== editingCategory.alias) {
				payload.alias = formData.alias.trim();
			}
			if (formData.leadingImage.url.trim()) {
				payload.leadingImage = formData.leadingImage;
			} else {
				payload.leadingImage = null;
			}

			const response = await fetch(`/api/admin/blog-categories/${editingCategory._id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const responseData = await response.json();

			if (!responseData) {
				throw new Error('No data returned from server');
			}

			const updatedCategory = responseData.data || responseData;
			categories = categories.map((c) => (c._id === editingCategory._id ? updatedCategory : c));
			message = 'Blog category updated successfully!';
			showEditDialog = false;
			editingCategory = null;
			resetForm();

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			logger.error('Error updating blog category:', err);
			error = handleError(err, 'Failed to update blog category');
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!categoryToDelete) return;

		deleting = true;
		error = '';
		message = '';

		try {
			const response = await fetch(`/api/admin/blog-categories/${categoryToDelete._id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			categories = categories.filter((c) => c._id !== categoryToDelete._id);
			message = 'Blog category deleted successfully!';
			showDeleteDialog = false;
			categoryToDelete = null;

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			logger.error('Error deleting blog category:', err);
			error = handleError(err, 'Failed to delete blog category');
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Blog Categories Management - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Blog Categories Management</h1>
					<p class="text-gray-600 mt-2">Organize blog articles into categories</p>
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
							placeholder="Search categories..."
							bind:value={searchTerm}
							on:input={() => loadCategories()}
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
						bind:value={activeFilter}
						on:change={() => loadCategories()}
						class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="all">All Status</option>
						<option value="true">Active</option>
						<option value="false">Inactive</option>
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
					Add Category
				</button>
			</div>

			<!-- Categories List -->
			{#if loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="mt-2 text-gray-600">Loading categories...</p>
				</div>
			{:else if categories.length === 0}
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
					<h3 class="text-lg font-semibold text-gray-900 mb-2">No categories found</h3>
					<p class="text-gray-600">Start by creating your first blog category.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each categories as category}
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
							<div class="flex items-start justify-between mb-3">
								<div class="flex-1">
									<h3 class="font-semibold text-gray-900 mb-1">{getCategoryTitle(category)}</h3>
									<p class="text-sm text-gray-500">
										Alias: <code class="bg-gray-100 px-1 rounded">{category.alias}</code>
									</p>
								</div>

								<div class="flex space-x-1">
									<button
										type="button"
										on:click={() => openEditDialog(category)}
										class="p-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
										aria-label="Edit category"
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
										on:click={() => openDeleteDialog(category)}
										class="p-1 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
										aria-label="Delete category"
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

							<div class="flex items-center justify-between mt-3">
								<span class="text-xs text-gray-500">
									Order: {category.sortOrder || 0}
								</span>
								{#if category.isActive}
									<span class="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
										Active
									</span>
								{:else}
									<span class="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
										Inactive
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
			<h2 class="text-xl font-bold text-gray-900 mb-4">Add New Blog Category</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<span class="block text-sm font-medium text-gray-700 mb-2">
						Title *
					</span>
					<MultiLangInput bind:value={formData.title} />
				</div>

				<div>
					<label for="alias" class="block text-sm font-medium text-gray-700 mb-2">
						Alias (optional - auto-generated if not provided)
					</label>
					<input
						type="text"
						id="alias"
						bind:value={formData.alias}
						placeholder="category-slug"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div>
					<span class="block text-sm font-medium text-gray-700 mb-2">
						Description
					</span>
					<MultiLangHTMLEditor bind:value={formData.description} />
				</div>

				<div>
					<label for="leading-image-url-create" class="block text-sm font-medium text-gray-700 mb-2">
						Leading Image URL
					</label>
					<input
						type="text"
						id="leading-image-url-create"
						bind:value={formData.leadingImage.url}
						placeholder="https://..."
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="sort-order-create" class="block text-sm font-medium text-gray-700 mb-2">
							Sort Order
						</label>
						<input
							type="number"
							id="sort-order-create"
							bind:value={formData.sortOrder}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div class="flex items-center pt-8">
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
						disabled={saving || !formData.title}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							Creating...
						{:else}
							Create Category
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Dialog -->
{#if showEditDialog && editingCategory}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Edit Blog Category</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div>
					<span class="block text-sm font-medium text-gray-700 mb-2">
						Title *
					</span>
					<MultiLangInput bind:value={formData.title} />
				</div>

				<div>
					<label for="alias-edit" class="block text-sm font-medium text-gray-700 mb-2">
						Alias
					</label>
					<input
						type="text"
						id="alias-edit"
						bind:value={formData.alias}
						placeholder="category-slug"
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div>
					<span class="block text-sm font-medium text-gray-700 mb-2">
						Description
					</span>
					<MultiLangHTMLEditor bind:value={formData.description} />
				</div>

				<div>
					<label for="leading-image-url-edit" class="block text-sm font-medium text-gray-700 mb-2">
						Leading Image URL
					</label>
					<input
						type="text"
						id="leading-image-url-edit"
						bind:value={formData.leadingImage.url}
						placeholder="https://..."
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="sort-order-edit" class="block text-sm font-medium text-gray-700 mb-2">
							Sort Order
						</label>
						<input
							type="number"
							id="sort-order-edit"
							bind:value={formData.sortOrder}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>

					<div class="flex items-center pt-8">
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
				</div>

				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							showEditDialog = false;
							editingCategory = null;
							resetForm();
						}}
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleEdit}
						disabled={saving || !formData.title}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							Updating...
						{:else}
							Update Category
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Dialog -->
{#if showDeleteDialog && categoryToDelete}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Delete Blog Category</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<p class="text-gray-600">
					Are you sure you want to delete <strong>{getCategoryTitle(categoryToDelete)}</strong> ({categoryToDelete.alias})? This
					action cannot be undone.
				</p>
				<div class="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
					<p class="text-sm text-yellow-800">
						⚠️ Make sure no blog articles are assigned to this category before deleting.
					</p>
				</div>
				<div class="flex justify-end space-x-2">
					<button
						type="button"
						on:click={() => {
							showDeleteDialog = false;
							categoryToDelete = null;
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
							Delete Category
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
