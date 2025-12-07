<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$lib/stores/language';

  export const data = undefined as any; // From +layout.server.ts, not used in this component

	interface BlogCategoryFormData {
		title: { en?: string; he?: string };
		description: { en?: string; he?: string };
		leadingImage?: {
			url: string;
			alt?: { en?: string; he?: string };
			storageProvider: string;
			storagePath: string;
		};
		isActive: boolean;
		sortOrder: number;
	}

	let categoryId = $page.params.id;
	let formData: BlogCategoryFormData = {
		title: { [$currentLanguage]: '' },
		description: { [$currentLanguage]: '' },
		isActive: true,
		sortOrder: 0
	};

	let loading = true;
	let saving = false;
	let error: string | null = null;
	let success: string | null = null;

	onMount(async () => {
		await fetchCategory();
	});

	async function fetchCategory() {
		if (!categoryId) return;

		try {
			loading = true;
			const response = await fetch(`/api/admin/blog-categories/${categoryId}`);
			if (!response.ok) {
				throw new Error('Failed to fetch category');
			}
			const result = await response.json();
			if (result.success) {
				const category = result.data;
				formData = {
					title: category.title || { [$currentLanguage]: '' },
					description: category.description || { [$currentLanguage]: '' },
					leadingImage: category.leadingImage,
					isActive: category.isActive,
					sortOrder: category.sortOrder
				};
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			loading = false;
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		saving = true;
		error = null;
		success = null;

		if (!MultiLangUtils.getTextValue(formData.title, $currentLanguage)) {
			error = 'Title is required';
			saving = false;
			return;
		}

		try {
			const response = await fetch(`/api/admin/blog-categories/${categoryId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					...formData,
					title: MultiLangUtils.clean(formData.title),
					description: MultiLangUtils.clean(formData.description)
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update category');
			}

			success = 'Category updated successfully!';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update category';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Edit Category - Admin</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen bg-gray-50 flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
			<p class="mt-4 text-gray-600">Loading...</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-4xl mx-auto px-4">
			<div class="flex justify-between items-center mb-8">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Edit Category</h1>
					<p class="text-gray-600 mt-2">Edit blog category information</p>
				</div>
				<button
					on:click={() => goto('/admin/blog-categories')}
					class="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
					</svg>
					Back to Categories
				</button>
			</div>

			{#if error}
				<div class="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
					<p class="text-sm text-red-800">{error}</p>
				</div>
			{/if}

			{#if success}
				<div class="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
					<p class="text-sm text-green-800">{success}</p>
				</div>
			{/if}

			<form on:submit={handleSubmit} class="space-y-6">
				<!-- Basic Information -->
				<div class="bg-white rounded-lg shadow-md p-6">
					<h3 class="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
					<div class="space-y-4">
						<div>
							<label for="title" class="block text-sm font-medium text-gray-700 mb-2"> Title * </label>
							<MultiLangInput bind:value={formData.title} placeholder="Enter category title..." required />
						</div>

						<div>
							<label for="description" class="block text-sm font-medium text-gray-700 mb-2">
								Description
							</label>
							<MultiLangInput
								bind:value={formData.description}
								placeholder="Enter category description..."
								multiline={true}
							/>
						</div>
					</div>
				</div>

				<!-- Leading Image -->
				<div class="bg-white rounded-lg shadow-md p-6">
					<h3 class="text-lg font-medium text-gray-900 mb-4">Leading Image</h3>
					<div>
						<label for="leading-image-url" class="block text-sm font-medium text-gray-700 mb-2"> Image URL </label>
						<input
							type="url"
							id="leading-image-url"
							value={formData.leadingImage?.url || ''}
							on:input={(e) => {
								formData.leadingImage = {
									url: e.currentTarget.value,
									alt: formData.leadingImage?.alt || { [$currentLanguage]: '' },
									storageProvider: 'local',
									storagePath: ''
								};
							}}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							placeholder="Enter image URL"
						/>
						<p class="mt-1 text-sm text-gray-500">
							Note: Full image upload functionality will be available in a future update
						</p>
					</div>
				</div>

				<!-- Settings -->
				<div class="bg-white rounded-lg shadow-md p-6">
					<h3 class="text-lg font-medium text-gray-900 mb-4">Settings</h3>
					<div class="space-y-4">
						<div class="flex items-center">
							<input
								id="isActive"
								name="isActive"
								type="checkbox"
								bind:checked={formData.isActive}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label for="isActive" class="ml-2 block text-sm text-gray-900"> Active </label>
						</div>
						<div>
							<label for="sortOrder" class="block text-sm font-medium text-gray-700 mb-2">
								Sort Order
							</label>
							<input
								type="number"
								id="sortOrder"
								bind:value={formData.sortOrder}
								class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
								placeholder="0"
							/>
							<p class="mt-1 text-sm text-gray-500">Lower numbers appear first</p>
						</div>
					</div>
				</div>

				<!-- Submit Button -->
				<div class="flex justify-end">
					<button
						type="submit"
						disabled={saving}
						class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if saving}
							<svg
								class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
							Saving...
						{:else}
							Save Changes
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
