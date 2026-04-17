<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import MultiLangInput from '$lib/components/MultiLangInput.svelte';
	import MultiLangHTMLEditor from '$lib/components/MultiLangHTMLEditor.svelte';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$lib/stores/language';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { t } from '$stores/i18n';
	import { productName } from '$stores/siteConfig';

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
	interface CategoryOption {
		alias: string;
		title: unknown;
	}

	let categoryOptions: CategoryOption[] = [];

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
			const response = await fetch('/api/admin/blog-categories?limit=200&isActive=true');
			if (!response.ok) await handleApiErrorResponse(response);
			const result = await response.json();
			// Dev Vite proxy sends many /api/admin/* routes to Nest: { data, pagination } without success.
			const rows = Array.isArray(result?.data)
				? result.data
				: Array.isArray(result)
					? result
					: [];
			const lang = get(currentLanguage);
			categoryOptions = rows
				.map((c: { _id?: string; alias?: string; title?: unknown }) => {
					const titleText = MultiLangUtils.getTextValue(
						c.title as Parameters<typeof MultiLangUtils.getTextValue>[0],
						lang
					).trim();
					return {
						alias: String(c.alias || titleText || c._id || '').trim(),
						title: c.title || titleText
					};
				})
				.filter((c: CategoryOption) => c.alias)
				.sort((a: CategoryOption, b: CategoryOption) =>
					MultiLangUtils.getTextValue(
						a.title as Parameters<typeof MultiLangUtils.getTextValue>[0],
						lang
					).localeCompare(
						MultiLangUtils.getTextValue(
							b.title as Parameters<typeof MultiLangUtils.getTextValue>[0],
							lang
						),
						undefined,
						{ sensitivity: 'base' }
					)
				);
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
			if (!MultiLangUtils.getTextValue(formData.title, $currentLanguage).trim()) {
				throw new Error($t('owner.titleRequired'));
			}
			if (!formData.category.trim()) {
				throw new Error($t('owner.categoryRequired'));
			}
			if (!MultiLangUtils.getHTMLValue(formData.content, $currentLanguage).trim()) {
				throw new Error($t('owner.contentRequired'));
			}

			const payload = { ...formData };
			if (!payload.leadingImage?.url?.trim()) {
				delete payload.leadingImage;
			}

			const response = await fetch('/api/admin/blog-articles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			success = $t('owner.articleCreatedSuccessfully');
			setTimeout(() => goto('/admin/blog-articles'), 1200);
		} catch (err) {
			logger.error('Failed to create article:', err);
			error = handleError(err, $t('owner.failedToCreateArticle'));
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('owner.createNewArticle')} — {$productName}</title>
</svelte:head>

<div class="py-8">
	<div class="max-w-4xl mx-auto px-4">
		<div class="flex justify-between items-center mb-8">
			<div>
				<h1 class="text-3xl font-bold text-(--color-surface-950-50)">{$t('owner.createNewArticle')}</h1>
				<p class="text-(--color-surface-600-400) mt-2">{$t('owner.createArticleDescription')}</p>
			</div>
			<button
				on:click={() => goto('/admin/blog-articles')}
				class="btn preset-filled-primary-500 inline-flex items-center"
			>
				{$t('admin.backToBlogWorkspace')}
			</button>
		</div>

		<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6">
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
				<div>
					<h3 class="text-lg font-medium text-(--color-surface-950-50) mb-4">{$t('owner.basicInformation')}</h3>
					<div class="space-y-4">
						<div>
							<label for="title" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
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
								<label for="category-select" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
									{$t('owner.category')} *
								</label>
								<select
									id="category-select"
									bind:value={formData.category}
									required
									class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm bg-(--color-surface-50-950) focus:outline-none focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
								>
									<option value="">{$t('admin.selectBlogCategory')}</option>
									{#each categoryOptions as c (c.alias)}
										<option value={c.alias}>
											{MultiLangUtils.getTextValue(
												c.title as Parameters<typeof MultiLangUtils.getTextValue>[0],
												$currentLanguage
											) || c.alias} ({c.alias})
										</option>
									{/each}
								</select>
								{#if categoryOptions.length === 0}
									<p class="mt-2 text-sm text-amber-700">
										<a href="/admin/blog-categories/new" class="underline">{$t('admin.createNewCategory')}</a>
									</p>
								{/if}
							</div>

							<div>
								<label for="tags" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
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
										class="flex-1 px-3 py-2 border border-surface-300-700 rounded-l-md shadow-sm focus:outline-none focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
										placeholder={$t('owner.addTag')}
									/>
									<button
										type="button"
										on:click={handleAddTag}
										class="px-3 py-2 bg-(--color-primary-600) text-white rounded-r-md hover:bg-(--color-primary-700)"
									>
										{$t('owner.add')}
									</button>
								</div>
								{#if formData.tags.length > 0}
									<div class="mt-2 flex flex-wrap gap-2">
										{#each formData.tags as tag}
											<span
												class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[color-mix(in_oklab,var(--color-primary-500)_22%,transparent)] text-(--color-primary-800)"
											>
												{tag}
												<button
													type="button"
													on:click={() => handleRemoveTag(tag)}
													class="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-(--color-primary-400) hover:bg-[color-mix(in_oklab,var(--color-primary-500)_28%,transparent)] hover:text-(--color-primary-500)"
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

				<div>
					<h3 class="text-lg font-medium text-(--color-surface-950-50) mb-4">{$t('owner.leadingImage')}</h3>
					<div>
						<label for="leading-image-url-admin" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('owner.profileImageUrl')}
						</label>
						<input
							type="url"
							id="leading-image-url-admin"
							value={formData.leadingImage?.url || ''}
							on:input={(e) => {
								formData.leadingImage = {
									url: e.currentTarget.value,
									alt: { [$currentLanguage]: '' },
									storageProvider: 'local',
									storagePath: ''
								};
							}}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md shadow-sm focus:outline-none focus:ring-(--color-primary-500) focus:border-(--color-primary-500)"
							placeholder={$t('owner.enterImageUrl')}
						/>
						<p class="mt-1 text-sm text-(--color-surface-600-400)">
							{$t('owner.profileImageNote')}
						</p>
					</div>
				</div>

				<div>
					<h3 class="text-lg font-medium text-(--color-surface-950-50) mb-4">{$t('owner.content')}</h3>
					<div class="space-y-4">
						<div>
							<label for="excerpt" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								{$t('owner.excerpt')}
							</label>
							<MultiLangInput
								bind:value={formData.excerpt}
								placeholder={$t('owner.enterExcerpt')}
								multiline={true}
							/>
						</div>

						<div>
							<span class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								{$t('owner.content')} *
							</span>
							<MultiLangHTMLEditor
								bind:value={formData.content}
								placeholder={$t('owner.enterContent')}
								height={300}
							/>
							<p class="mt-1 text-sm text-(--color-surface-600-400)">
								{$t('owner.contentHelp')}
							</p>
						</div>
					</div>
				</div>

				<div>
					<h3 class="text-lg font-medium text-(--color-surface-950-50) mb-4">{$t('owner.seo')}</h3>
					<div class="space-y-4">
						<div>
							<label for="seoTitle" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
								{$t('owner.seoTitle')}
							</label>
							<MultiLangInput bind:value={formData.seoTitle} placeholder={$t('owner.enterSeoTitle')} />
						</div>

						<div>
							<label for="seoDescription" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
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

				<div>
					<h3 class="text-lg font-medium text-(--color-surface-950-50) mb-4">{$t('owner.settings')}</h3>
					<div class="space-y-4">
						<div class="flex items-center">
							<input
								type="checkbox"
								id="isPublished"
								bind:checked={formData.isPublished}
								class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
							/>
							<label for="isPublished" class="ml-2 block text-sm text-(--color-surface-950-50)">
								{$t('owner.publishArticle')}
							</label>
						</div>

						<div class="flex items-center">
							<input
								type="checkbox"
								id="isFeatured"
								bind:checked={formData.isFeatured}
								class="h-4 w-4 text-(--color-primary-600) focus:ring-(--color-primary-500) border-surface-300-700 rounded"
							/>
							<label for="isFeatured" class="ml-2 block text-sm text-(--color-surface-950-50)">
								{$t('owner.featureArticle')}
							</label>
						</div>
					</div>
				</div>

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
