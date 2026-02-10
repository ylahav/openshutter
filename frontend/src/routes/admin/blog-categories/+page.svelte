<script lang="ts">
	import { onMount } from 'svelte';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import type { MultiLangText } from '$lib/types/multi-lang';
	import { useCrudLoader } from '$lib/composables/useCrudLoader';
	import { useCrudOperations } from '$lib/composables/useCrudOperations';
	import { useDialogManager } from '$lib/composables/useDialogManager';
	import { normalizeMultiLangText } from '$lib/utils/multiLangHelpers';
	import type { PageData } from './$types';

	// svelte-ignore export_let_unused - Required by SvelteKit page component
	export let data: PageData;

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

	// Use CRUD composables
	const crudLoader = useCrudLoader<BlogCategory>('/api/admin/blog-categories', {
		searchParam: 'q',
		searchValue: () => searchTerm,
		filterParams: {
			isActive: () => activeFilter
		}
	});
	const crudOps = useCrudOperations<BlogCategory>('/api/admin/blog-categories', {
		createSuccessMessage: 'Blog category created successfully!',
		updateSuccessMessage: 'Blog category updated successfully!',
		deleteSuccessMessage: 'Blog category deleted successfully!',
		transformPayload: (data: any) => {
			// This is called for both create and update
			// For create, we use the data as-is
			// For update, handleEdit will transform it before calling update
			return data;
		},
		onCreateSuccess: (newCategory) => {
			crudLoader.items.update(items => [...items, newCategory]);
			dialogs.closeAll();
			resetForm();
		},
		onUpdateSuccess: (updatedCategory) => {
			const currentEditingCategory = editingCategory;
			if (currentEditingCategory) {
				crudLoader.items.update(items => 
					items.map(c => c._id === currentEditingCategory._id ? updatedCategory : c)
				);
			}
			dialogs.closeAll();
			editingCategory = null;
			resetForm();
		},
		onDeleteSuccess: () => {
			const currentCategoryToDelete = categoryToDelete;
			if (currentCategoryToDelete) {
				crudLoader.items.update(items => 
					items.filter(c => c._id !== currentCategoryToDelete._id)
				);
			}
			dialogs.closeAll();
			categoryToDelete = null;
		}
	});
	const dialogs = useDialogManager();

	// Reactive stores from composables
	let categories: BlogCategory[] = [];
	let loading = false;
	let saving = false;
	let message = '';
	let error = '';
	let searchTerm = '';
	let activeFilter = 'all';
	let showCreateDialog = false;
	let showEditDialog = false;
	let showDeleteDialog = false;
	let editingCategory: BlogCategory | null = null;
	let categoryToDelete: BlogCategory | null = null;

	// Subscribe to stores
	crudLoader.items.subscribe(value => categories = value);
	crudLoader.loading.subscribe(value => loading = value);
	crudLoader.error.subscribe(value => {
		if (value) error = value;
	});
	crudOps.saving.subscribe(value => saving = value);
	crudOps.error.subscribe(value => {
		if (value) error = value;
	});
	crudOps.message.subscribe(value => message = value);
	dialogs.showCreate.subscribe(value => showCreateDialog = value);
	dialogs.showEdit.subscribe(value => showEditDialog = value);
	dialogs.showDelete.subscribe(value => showDeleteDialog = value);

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
		await crudLoader.loadItems();
	});

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
		dialogs.openCreate();
		crudOps.error.set('');
	}

	function openEditDialog(category: BlogCategory) {
		editingCategory = category;
		formData = {
			alias: category.alias || '',
			title: normalizeMultiLangText(category.title),
			description: normalizeMultiLangText(category.description),
			leadingImage: category.leadingImage || {
				url: '',
				alt: { en: '', he: '' },
				storageProvider: '',
				storagePath: ''
			},
			isActive: category.isActive !== undefined ? category.isActive : true,
			sortOrder: category.sortOrder || 0
		};
		dialogs.openEdit();
		crudOps.error.set('');
	}

	function openDeleteDialog(category: BlogCategory) {
		categoryToDelete = category;
		dialogs.openDelete();
		crudOps.error.set('');
	}

	function getCategoryTitle(category: BlogCategory): string {
		const titleField = typeof category.title === 'string' ? category.title : category.title;
		if (typeof titleField === 'string') return titleField;
		return titleField?.en || titleField?.he || category.alias || '(No title)';
	}

	async function handleCreate() {
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
		const newCategory = await crudOps.create(payload);
		if (newCategory) {
			// Success handled by onCreateSuccess callback
		}
	}

	async function handleEdit() {
		if (!editingCategory) return;
		const currentEditingCategory = editingCategory;
		const payload: any = {
			title: formData.title,
			description: formData.description,
			isActive: formData.isActive,
			sortOrder: formData.sortOrder
		};
		if (formData.alias.trim() && formData.alias !== currentEditingCategory.alias) {
			payload.alias = formData.alias.trim();
		}
		if (formData.leadingImage.url.trim()) {
			payload.leadingImage = formData.leadingImage;
		} else {
			payload.leadingImage = null;
		}
		const updatedCategory = await crudOps.update(currentEditingCategory._id, payload);
		if (updatedCategory) {
			// Success handled by onUpdateSuccess callback
		}
	}

	async function handleDelete() {
		if (!categoryToDelete) return;
		const currentCategoryToDelete = categoryToDelete;
		const success = await crudOps.remove(currentCategoryToDelete._id);
		if (success) {
			// Success handled by onDeleteSuccess callback
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
				<a href="/admin" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium">
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
							on:input={() => crudLoader.loadItems()}
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
						on:change={() => crudLoader.loadItems()}
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
							dialogs.closeAll();
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
							dialogs.closeAll();
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
							dialogs.closeAll();
							categoryToDelete = null;
						}}
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleDelete}
						disabled={saving}
						class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
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
