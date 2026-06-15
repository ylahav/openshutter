<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$lib/stores/language';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { adminToast } from '$lib/admin/adminToast';
	import { adminBtnPrimary, adminRingPrimary } from '$lib/admin/admin-cerberus';
	import { t } from '$stores/i18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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

	let formData: BlogCategoryFormData = {
		title: { [$currentLanguage]: '' },
		description: { [$currentLanguage]: '' },
		isActive: true,
		sortOrder: 0
	};

	let saving = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		saving = true;

		if (!MultiLangUtils.getTextValue(formData.title, $currentLanguage)) {
			adminToast.error({ title: $t('admin.titleRequired') });
			saving = false;
			return;
		}

		try {
			const response = await fetch('/api/admin/blog-categories', {
				method: 'POST',
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

			adminToast.success({ title: $t('admin.categoryCreatedSuccessfully') });
			setTimeout(() => {
				goto('/admin/blog-categories');
			}, 1500);
		} catch (err) {
			logger.error('Failed to create category:', err);
			adminToast.error({ title: handleError(err, 'Failed to create category') });
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('admin.createNewCategory')} - {$t('navigation.admin')}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-4xl mx-auto px-4">
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-3xl font-bold text-(--color-surface-950-50)">{$t('admin.createNewCategory')}</h1>
				<p class="text-(--color-surface-600-400) mt-2">{$t('admin.createCategoryDescription')}</p>
			</div>
			<button
				onclick={() => goto('/admin/blog-categories')}
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

		<form onsubmit={handleSubmit} class="space-y-6">
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
          <label for="leading-image-url-new" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
						{$t('admin.imageUrl')}
          </label>
					<input
						type="url"
						id="leading-image-url-new"
						value={formData.leadingImage?.url || ''}
						oninput={(e) => {
							formData.leadingImage = {
								url: e.currentTarget.value,
								alt: { [$currentLanguage]: '' },
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
						{$t('admin.creating')}
					{:else}
						{$t('admin.createCategory')}
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
