<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
import { MultiLangUtils } from '$lib/utils/multiLang';
import { currentLanguage } from '$lib/stores/language';
import { logger } from '$lib/utils/logger';
import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
import { t } from '$stores/i18n';
	import type { PageData } from './$types';

	export let data: PageData;

	interface BlogFormData {
		title: { en?: string; he?: string };
		category: string;
		tags: string[];
		content: { en?: string; he?: string };
		excerpt: { en?: string; he?: string };
		isPublished: boolean;
		isFeatured: boolean;
		leadingImage?: {
			url: string;
			alt: { en?: string; he?: string };
			storageProvider: string;
			storagePath: string;
		};
		seoTitle: { en?: string; he?: string };
		seoDescription: { en?: string; he?: string };
	}

	let saving = false;
	let error: string | null = null;
	let success: string | null = null;
	let categories: string[] = [];

	let formData: BlogFormData = {
		title: { [$currentLanguage]: '' },
		category: '',
		tags: [],
		content: { [$currentLanguage]: '' },
		excerpt: { [$currentLanguage]: '' },
		isPublished: false,
		isFeatured: false,
		seoTitle: { [$currentLanguage]: '' },
		seoDescription: { [$currentLanguage]: '' }
	};

	let tagInput = '';

	onMount(async () => {
		await loadCategories();
	});

	async function loadCategories() {
		try {
			const response = await fetch('/api/owner/blog');
			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					const uniqueCategories = [
						...new Set((result.data || []).map((article: any) => article.category))
					] as string[];
					categories = uniqueCategories;
				}
			}
		} catch (err) {
			logger.error('Failed to load categories:', err);
		}
	}

	function handleAddTag() {
		if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
			formData = {
				...formData,
				tags: [...formData.tags, tagInput.trim()]
			};
			tagInput = '';
		}
	}

	function handleRemoveTag(tagToRemove: string) {
		formData = {
			...formData,
			tags: formData.tags.filter((tag) => tag !== tagToRemove)
		};
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();
		saving = true;
		error = null;
		success = null;

		try {
			// Validate required fields
			if (!MultiLangUtils.getTextValue(formData.title, $currentLanguage).trim()) {
				throw new Error($t('owner.titleRequired'));
			}
			if (!formData.category.trim()) {
				throw new Error($t('owner.categoryRequired'));
			}
			if (!MultiLangUtils.getHTMLValue(formData.content, $currentLanguage).trim()) {
				throw new Error($t('owner.contentRequired'));
			}

			const response = await fetch('/api/owner/blog', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || $t('owner.failedToCreateArticle'));
			}

			success = $t('owner.articleCreatedSuccessfully');

			// Reset form
			formData = {
				title: { [$currentLanguage]: '' },
				category: '',
				tags: [],
				content: { [$currentLanguage]: '' },
				excerpt: { [$currentLanguage]: '' },
				isPublished: false,
				isFeatured: false,
				seoTitle: { [$currentLanguage]: '' },
				seoDescription: { [$currentLanguage]: '' }
			};
		} catch (err) {
			logger.error('Failed to create article:', err);
			error = handleError(err, $t('owner.failedToCreateArticle'));
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('owner.createNewArticle')} - {$t('owner.blogManagement')}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-4xl mx-auto px-4">
		<!-- Header -->
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-3xl font-bold text-gray-900">{$t('owner.createNewArticle')}</h1>
				<p class="text-gray-600 mt-2">{$t('owner.createArticleDescription')}</p>
			</div>
			<button
				on:click={() => goto('/owner/blog')}
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
				{$t('owner.backToBlog')}
			</button>
		</div>

		<!-- Form -->
		<div class="bg-white rounded-lg shadow-md p-6">
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
				<div>
					<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.basicInformation')}</h3>
					<div class="space-y-4">
						<div>
							<label for="title" class="block text-sm font-medium text-gray-700 mb-2">
								{$t('owner.title')} *
							</label>
							<MultiLangInput
								bind:value={formData.title}
								placeholder={$t('owner.enterArticleTitle')}
								required
							/>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label for="category" class="block text-sm font-medium text-gray-700 mb-2">
									{$t('owner.category')} *
								</label>
								<input
									type="text"
									id="category"
									bind:value={formData.category}
									required
									list="categories"
									class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
									placeholder={$t('owner.enterCategory')}
								/>
								<datalist id="categories">
									{#each categories as category}
										<option value={category}></option>
									{/each}
								</datalist>
							</div>

							<div>
								<label for="tags" class="block text-sm font-medium text-gray-700 mb-2">
									{$t('owner.tags')}
								</label>
								<div class="flex">
									<input
										type="text"
										id="tags"
										bind:value={tagInput}
										on:keypress={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												handleAddTag();
											}
										}}
										class="flex-1 px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
										placeholder={$t('owner.addTag')}
									/>
									<button
										type="button"
										on:click={handleAddTag}
										class="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
									>
										{$t('owner.add')}
									</button>
								</div>
								{#if formData.tags.length > 0}
									<div class="mt-2 flex flex-wrap gap-2">
										{#each formData.tags as tag}
											<span
												class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
											>
												{tag}
												<button
													type="button"
													on:click={() => handleRemoveTag(tag)}
													class="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-500"
													aria-label="Remove tag"
												>
													<svg class="w-2 h-2" fill="currentColor" viewBox="0 0 8 8">
														<path
															d="M6.564.75L5.25 2.064 3.936.75 3.25 1.436 4.564 2.75 3.25 4.064 3.936 4.75 5.25 3.436 6.564 4.75 7.25 4.064 5.936 2.75 7.25 1.436z"
														/>
													</svg>
												</button>
											</span>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Leading Image -->
				<div>
					<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.leadingImage')}</h3>
					<div>
						<label for="leading-image-url-owner" class="block text-sm font-medium text-gray-700 mb-2">
							{$t('owner.profileImageUrl')}
						</label>
              <input
                type="url"
                id="leading-image-url-owner"
                value={formData.leadingImage?.url || ''}
                on:input={(e) => {
                  formData.leadingImage = {
									url: e.currentTarget.value,
									alt: { [$currentLanguage]: '' },
									storageProvider: 'local',
									storagePath: ''
								};
							}}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							placeholder={$t('owner.enterImageUrl')}
						/>
						<p class="mt-1 text-sm text-gray-500">
							{$t('owner.profileImageNote')}
						</p>
					</div>
				</div>

				<!-- Content -->
				<div>
					<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.content')}</h3>
					<div class="space-y-4">
						<div>
							<label for="excerpt" class="block text-sm font-medium text-gray-700 mb-2">
								{$t('owner.excerpt')}
							</label>
							<MultiLangInput
								bind:value={formData.excerpt}
								placeholder={$t('owner.enterExcerpt')}
								multiline={true}
							/>
						</div>

						<div>
							<span class="block text-sm font-medium text-gray-700 mb-2">
								{$t('owner.content')} *
							</span>
							<MultiLangHTMLEditor
								bind:value={formData.content}
								placeholder={$t('owner.enterContent')}
								height={300}
							/>
							<p class="mt-1 text-sm text-gray-500">
								{$t('owner.contentHelp')}
							</p>
						</div>
					</div>
				</div>

				<!-- SEO -->
				<div>
					<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.seo')}</h3>
					<div class="space-y-4">
						<div>
							<label for="seoTitle" class="block text-sm font-medium text-gray-700 mb-2">
								{$t('owner.seoTitle')}
							</label>
							<MultiLangInput
								bind:value={formData.seoTitle}
								placeholder={$t('owner.enterSeoTitle')}
							/>
						</div>

						<div>
							<label for="seoDescription" class="block text-sm font-medium text-gray-700 mb-2">
								{$t('owner.seoDescription')}
							</label>
							<MultiLangInput
								bind:value={formData.seoDescription}
								placeholder={$t('owner.enterSeoDescription')}
								multiline={true}
							/>
						</div>
					</div>
				</div>

				<!-- Settings -->
				<div>
					<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.settings')}</h3>
					<div class="space-y-4">
						<div class="flex items-center">
							<input
								type="checkbox"
								id="isPublished"
								bind:checked={formData.isPublished}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label for="isPublished" class="ml-2 block text-sm text-gray-900">
								{$t('owner.publishArticle')}
							</label>
						</div>

						<div class="flex items-center">
							<input
								type="checkbox"
								id="isFeatured"
								bind:checked={formData.isFeatured}
								class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
							/>
							<label for="isFeatured" class="ml-2 block text-sm text-gray-900">
								{$t('owner.featureArticle')}
							</label>
						</div>
					</div>
				</div>

				<!-- Submit Button -->
				<div class="flex justify-end">
					<button
						type="submit"
						disabled={saving}
						class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
							{$t('owner.saving')}
						{:else}
							{$t('owner.createArticle')}
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
