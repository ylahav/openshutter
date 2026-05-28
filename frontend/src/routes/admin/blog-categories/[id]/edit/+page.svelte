<script lang="ts">
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$lib/stores/language';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { adminToast } from '$lib/admin/adminToast';
	import { adminBtnPrimary, adminRingPrimary } from '$lib/admin/admin-cerberus';
	import { t } from '$stores/i18n';
	import { get } from 'svelte/store';

	// PageData is loaded via +page.server.ts; this component does not
// currently consume it directly, so we omit the prop to avoid unused-export warnings.

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

	const loading = writable(true);
	let saving = false;

	onMount(async () => {
		await fetchCategory();
	});

	async function fetchCategory() {
		if (!categoryId) return;

		try {
			loading.set(true);
			const response = await fetch(`/api/admin/blog-categories/${categoryId}`);
			if (!response.ok) {
				throw new Error(get(t)('admin.failedToLoadCategory'));
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
			adminToast.error({
				title: err instanceof Error ? err.message : get(t)('admin.unknown'),
			});
		} finally {
			loading.set(false);
		}
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		saving = true;

		if (!MultiLangUtils.getTextValue(formData.title, $currentLanguage)) {
			adminToast.error({ title: get(t)('admin.titleRequired') });
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
				await handleApiErrorResponse(response);
			}

			adminToast.success({ title: get(t)('admin.categoryUpdatedSuccessfully') });
		} catch (err) {
			logger.error('Failed to update category:', err);
			adminToast.error({ title: handleError(err, 'Failed to update category') });
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('admin.editCategory')} - {$t('navigation.admin')}</title>
</svelte:head>

{#if $loading}
	<div class="min-h-[50vh] flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-(--color-primary-600) mx-auto"></div>
			<p class="mt-4 text-(--color-surface-600-400)">Loading...</p>
		</div>
	</div>
{:else}
	<div class="py-8">
		<div class="max-w-4xl mx-auto px-4">
			<div class="flex justify-between items-center mb-8">
				<div>
					<h1 class="text-3xl font-bold text-(--color-surface-950-50)">{$t('admin.editCategory')}</h1>
					<p class="text-(--color-surface-600-400) mt-2">{$t('admin.editCategoryDescription')}</p>
				</div>
				<button
					on:click={() => goto('/admin/blog-categories')}
					class="btn preset-filled-primary-500 inline-flex items-center"
				>
					<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 19l-7-7m0 0l7-7m-7 7h18"
						/>
				</svg>
					{$t('admin.backToCategories')}
				</button>
			</div>

			<form on:submit={handleSubmit} class="space-y-6">
				<!-- Basic Information -->
				<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
					<h3 class="text-lg font-medium text-(--color-surface-950-50) mb-4">{$t('admin.basicInformation')}</h3>
					<div class="space-y-4">
						<div>
							<label for="title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								{$t('admin.title')} *
							</label>
							<MultiLangInput bind:value={formData.title} placeholder={$t('admin.enterCategoryTitle')} required />
						</div>

						<div>
							<label for="description" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								{$t('admin.description')}
							</label>
							<MultiLangInput
								bind:value={formData.description}
								placeholder={$t('admin.enterCategoryDescription')}
								multiline={true}
							/>
						</div>
					</div>
				</div>

				<!-- Leading Image -->
				<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
					<h3 class="text-lg font-medium text-(--color-surface-950-50) mb-4">{$t('admin.leadingImage')}</h3>
					<div>
						<label for="leading-image-url" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('admin.imageUrl')}
						</label>
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
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:outline-none focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
							placeholder={$t('admin.enterImageUrl')}
						/>
						<p class="mt-1 text-sm text-(--color-surface-600-400)">
							{$t('admin.imageUploadNote')}
						</p>
					</div>
				</div>

				<!-- Settings -->
				<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
					<h3 class="text-lg font-medium text-(--color-surface-950-50) mb-4">{$t('admin.settings')}</h3>
					<div class="space-y-4">
						<div class="flex items-center">
							<input
								id="isActive"
								name="isActive"
								type="checkbox"
								bind:checked={formData.isActive}
								class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
							/>
							<label for="isActive" class="ml-2 block text-sm text-(--color-surface-950-50)">
								{$t('admin.active')}
							</label>
						</div>
						<div>
							<label for="sortOrder" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								{$t('admin.sortOrder')}
							</label>
							<input
								type="number"
								id="sortOrder"
								bind:value={formData.sortOrder}
								class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:outline-none focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
								placeholder="0"
							/>
							<p class="mt-1 text-sm text-(--color-surface-600-400)">{$t('admin.sortOrderHelp')}</p>
						</div>
					</div>
				</div>

				<!-- Submit Button -->
				<div class="flex justify-end">
					<button
						type="submit"
						disabled={saving}
						class="{adminBtnPrimary} {adminRingPrimary} px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
					>
						{#if saving}
							<svg
								class="animate-spin -ml-1 mr-3 h-5 w-5 text-current opacity-80"
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
							{$t('admin.saving')}
						{:else}
							{$t('admin.saveChanges')}
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
