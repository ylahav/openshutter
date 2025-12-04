<script lang="ts">
	import { onMount } from 'svelte';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import type { MultiLangText, MultiLangHTML } from '$lib/types/multi-lang';

	export let data; // From +layout.server.ts, contains user info

	interface Page {
		_id: string;
		title: MultiLangText | string;
		subtitle?: MultiLangText | string;
		alias: string;
		leadingImage?: string;
		introText?: MultiLangHTML | string;
		content?: MultiLangHTML | string;
		category: 'system' | 'site';
		isPublished?: boolean;
		createdAt?: string;
		updatedAt?: string;
	}

	const CATEGORIES = [
		{ value: 'site', label: 'Site Page' },
		{ value: 'system', label: 'System Page' }
	];

	let pages: Page[] = [];
	let loading = true;
	let saving = false;
	let deleting = false;
	let message = '';
	let error = '';
	let searchTerm = '';
	let categoryFilter = 'all';
	let publishedFilter = 'all';
	let showCreateDialog = false;
	let showEditDialog = false;
	let showDeleteDialog = false;
	let editingPage: Page | null = null;
	let pageToDelete: Page | null = null;

	// Form state
	let formData = {
		title: { en: '', he: '' } as MultiLangText,
		subtitle: { en: '', he: '' } as MultiLangText,
		alias: '',
		leadingImage: '',
		introText: { en: '', he: '' } as MultiLangHTML,
		content: { en: '', he: '' } as MultiLangHTML,
		category: 'site' as 'system' | 'site',
		isPublished: false
	};

	onMount(async () => {
		await loadPages();
	});

	async function loadPages() {
		loading = true;
		error = '';
		try {
			const params = new URLSearchParams();
			if (categoryFilter !== 'all') params.append('category', categoryFilter);
			if (publishedFilter !== 'all') params.append('published', publishedFilter);
			if (searchTerm) params.append('search', searchTerm);

			const response = await fetch(`/api/admin/pages?${params.toString()}`);
			if (!response.ok) {
				throw new Error('Failed to load pages');
			}
			const result = await response.json();
			pages = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : []);
		} catch (err) {
			console.error('Error loading pages:', err);
			error = `Failed to load pages: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		formData = {
			title: { en: '', he: '' },
			subtitle: { en: '', he: '' },
			alias: '',
			leadingImage: '',
			introText: { en: '', he: '' },
			content: { en: '', he: '' },
			category: 'site',
			isPublished: false
		};
	}

	function openCreateDialog() {
		resetForm();
		showCreateDialog = true;
		error = '';
	}

	function openEditDialog(page: Page) {
		editingPage = page;
		const titleField = typeof page.title === 'string' ? { en: page.title, he: '' } : page.title || { en: '', he: '' };
		const subtitleField = typeof page.subtitle === 'string'
			? { en: page.subtitle, he: '' }
			: page.subtitle || { en: '', he: '' };
		const introField = typeof page.introText === 'string'
			? { en: page.introText, he: '' }
			: page.introText || { en: '', he: '' };
		const contentField = typeof page.content === 'string'
			? { en: page.content, he: '' }
			: page.content || { en: '', he: '' };
		formData = {
			title: titleField,
			subtitle: subtitleField,
			alias: page.alias || '',
			leadingImage: page.leadingImage || '',
			introText: introField,
			content: contentField,
			category: page.category || 'site',
			isPublished: page.isPublished || false
		};
		showEditDialog = true;
		error = '';
	}

	function openDeleteDialog(page: Page) {
		pageToDelete = page;
		showDeleteDialog = true;
	}

	function getPageTitle(page: Page): string {
		const titleField = typeof page.title === 'string' ? page.title : page.title;
		if (typeof titleField === 'string') return titleField;
		return titleField?.en || titleField?.he || page.alias || '(No title)';
	}

	async function handleCreate() {
		saving = true;
		error = '';
		message = '';

		try {
			const response = await fetch('/api/admin/pages', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			const responseData = await response.json().catch((e) => {
				console.error('Failed to parse response:', e);
				return null;
			});

			if (!response.ok) {
				const errorMessage = responseData?.message || `HTTP ${response.status}: Failed to create page`;
				throw new Error(errorMessage);
			}

			if (!responseData) {
				throw new Error('No data returned from server');
			}

			const newPage = responseData.data || responseData;
			pages = [...pages, newPage];
			message = 'Page created successfully!';
			showCreateDialog = false;
			resetForm();

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			console.error('Error creating page:', err);
			error = `Failed to create page: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			saving = false;
		}
	}

	async function handleEdit() {
		if (!editingPage) return;

		saving = true;
		error = '';
		message = '';

		try {
			const response = await fetch(`/api/admin/pages/${editingPage._id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			const responseData = await response.json().catch((e) => {
				console.error('Failed to parse response:', e);
				return null;
			});

			if (!response.ok) {
				const errorMessage = responseData?.message || `HTTP ${response.status}: Failed to update page`;
				throw new Error(errorMessage);
			}

			if (!responseData) {
				throw new Error('No data returned from server');
			}

			const updatedPage = responseData.data || responseData;
			pages = pages.map((p) => (p._id === editingPage._id ? updatedPage : p));
			message = 'Page updated successfully!';
			showEditDialog = false;
			editingPage = null;
			resetForm();

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			console.error('Error updating page:', err);
			error = `Failed to update page: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			saving = false;
		}
	}

	async function handleDelete() {
		if (!pageToDelete) return;

		deleting = true;
		error = '';
		message = '';

		try {
			const response = await fetch(`/api/admin/pages/${pageToDelete._id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Failed to delete page');
			}

			pages = pages.filter((p) => p._id !== pageToDelete._id);
			message = 'Page deleted successfully!';
			showDeleteDialog = false;
			pageToDelete = null;

			setTimeout(() => {
				message = '';
			}, 3000);
		} catch (err) {
			console.error('Error deleting page:', err);
			error = `Failed to delete page: ${err instanceof Error ? err.message : 'Unknown error'}`;
		} finally {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Pages Management - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-6xl mx-auto px-4">
		<div class="bg-white rounded-lg shadow-md p-6">
			<div class="flex items-center justify-between mb-6">
				<div>
					<h1 class="text-2xl font-bold text-gray-900">Pages Management</h1>
					<p class="text-gray-600 mt-2">Create and manage site pages</p>
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
							placeholder="Search pages..."
							bind:value={searchTerm}
							on:input={() => loadPages()}
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
						on:change={() => loadPages()}
						class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="all">All Categories</option>
						{#each CATEGORIES as cat}
							<option value={cat.value}>{cat.label}</option>
						{/each}
					</select>

					<select
						bind:value={publishedFilter}
						on:change={() => loadPages()}
						class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					>
						<option value="all">All Status</option>
						<option value="true">Published</option>
						<option value="false">Draft</option>
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
					Add Page
				</button>
			</div>

			<!-- Pages List -->
			{#if loading}
				<div class="text-center py-8">
					<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<p class="mt-2 text-gray-600">Loading pages...</p>
				</div>
			{:else if pages.length === 0}
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
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<h3 class="text-lg font-semibold text-gray-900 mb-2">No pages found</h3>
					<p class="text-gray-600">Start by creating your first page.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each pages as page}
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
							<div class="flex items-start justify-between mb-3">
								<div class="flex-1">
									<h3 class="font-semibold text-gray-900 mb-1">{getPageTitle(page)}</h3>
									<p class="text-sm text-gray-500">
										Alias: <code class="bg-gray-100 px-1 rounded">{page.alias}</code>
									</p>
								</div>

								<div class="flex space-x-1">
									<button
										type="button"
										on:click={() => openEditDialog(page)}
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
										on:click={() => openDeleteDialog(page)}
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

							<div class="flex items-center justify-between mt-3">
								<span
									class="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800"
								>
									{CATEGORIES.find((c) => c.value === page.category)?.label || page.category}
								</span>
								{#if page.isPublished}
									<span class="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
										Published
									</span>
								{:else}
									<span class="px-2 py-1 text-xs font-medium rounded bg-yellow-100 text-yellow-800">
										Draft
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
		<div class="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Add New Page</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Title *
						</label>
						<MultiLangInput bind:value={formData.title} />
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Alias *
						</label>
						<input
							type="text"
							bind:value={formData.alias}
							placeholder="page-url-slug"
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Subtitle
					</label>
					<MultiLangInput bind:value={formData.subtitle} />
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Category
						</label>
						<select
							bind:value={formData.category}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						>
							{#each CATEGORIES as cat}
								<option value={cat.value}>{cat.label}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Leading Image URL
						</label>
						<input
							type="text"
							bind:value={formData.leadingImage}
							placeholder="https://..."
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Intro Text
					</label>
					<MultiLangHTMLEditor bind:value={formData.introText} />
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Content
					</label>
					<MultiLangHTMLEditor bind:value={formData.content} />
				</div>

				<div class="flex items-center">
					<label class="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.isPublished}
							class="sr-only peer"
						/>
						<div
							class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
						></div>
						<span class="ml-3 text-sm font-medium text-gray-700">
							Published
						</span>
					</label>
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
						disabled={saving || !formData.title || !formData.alias.trim()}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							Creating...
						{:else}
							Create Page
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Edit Dialog -->
{#if showEditDialog && editingPage}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Edit Page</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Title *
						</label>
						<MultiLangInput bind:value={formData.title} />
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Alias *
						</label>
						<input
							type="text"
							bind:value={formData.alias}
							placeholder="page-url-slug"
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Subtitle
					</label>
					<MultiLangInput bind:value={formData.subtitle} />
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Category
						</label>
						<select
							bind:value={formData.category}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						>
							{#each CATEGORIES as cat}
								<option value={cat.value}>{cat.label}</option>
							{/each}
						</select>
					</div>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-2">
							Leading Image URL
						</label>
						<input
							type="text"
							bind:value={formData.leadingImage}
							placeholder="https://..."
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
						/>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Intro Text
					</label>
					<MultiLangHTMLEditor bind:value={formData.introText} />
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Content
					</label>
					<MultiLangHTMLEditor bind:value={formData.content} />
				</div>

				<div class="flex items-center">
					<label class="relative inline-flex items-center cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.isPublished}
							class="sr-only peer"
						/>
						<div
							class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"
						></div>
						<span class="ml-3 text-sm font-medium text-gray-700">
							Published
						</span>
					</label>
				</div>

				<div class="flex justify-end space-x-2 pt-4">
					<button
						type="button"
						on:click={() => {
							showEditDialog = false;
							editingPage = null;
							resetForm();
						}}
						class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						on:click={handleEdit}
						disabled={saving || !formData.title || !formData.alias.trim()}
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
					>
						{#if saving}
							Updating...
						{:else}
							Update Page
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Dialog -->
{#if showDeleteDialog && pageToDelete}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
		<div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
			<h2 class="text-xl font-bold text-gray-900 mb-4">Delete Page</h2>

			{#if error}
				<div class="mb-4 p-4 bg-red-50 text-red-700 rounded-md">{error}</div>
			{/if}

			<div class="space-y-4">
				<p class="text-gray-600">
					Are you sure you want to delete <strong>{getPageTitle(pageToDelete)}</strong> ({pageToDelete.alias})? This
					action cannot be undone.
				</p>
				<div class="flex justify-end space-x-2">
					<button
						type="button"
						on:click={() => {
							showDeleteDialog = false;
							pageToDelete = null;
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
							Delete Page
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

