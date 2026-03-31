<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
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

	let loading = true;
	let saving = false;
	let error: string | null = null;
	let success: string | null = null;
	interface CategoryOption {
		alias: string;
		title: unknown;
	}

	let categoryOptions: CategoryOption[] = [];
	let articleId = '';

	let formData: BlogFormData = {
		title: { en: '', he: '' },
		category: '',
		tags: [],
		content: { en: '', he: '' },
		excerpt: { en: '', he: '' },
		isPublished: false,
		isFeatured: false,
		seoTitle: { en: '', he: '' },
		seoDescription: { en: '', he: '' }
	};

	let tagInput = '';

	function asLangObj(val: unknown): { en?: string; he?: string } {
		if (val && typeof val === 'object') return { ...(val as object) } as { en?: string; he?: string };
		if (typeof val === 'string') return { en: val, he: '' };
		return { en: '', he: '' };
	}

	onMount(async () => {
		articleId = $page.params.id ?? '';
		if (!articleId) {
			error = 'Missing article id';
			loading = false;
			return;
		}
		await loadCategories();
		await loadArticle();
	});

	async function loadCategories() {
		try {
			const response = await fetch('/api/admin/blog-categories?limit=200&isActive=true');
			if (!response.ok) await handleApiErrorResponse(response);
			const result = await response.json();
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

	async function loadArticle() {
		try {
			loading = true;
			const res = await fetch(`/api/admin/blog-articles/${articleId}`);
			if (!res.ok) await handleApiErrorResponse(res);
			const json = await res.json();
			// Dev Vite proxy returns Nest body as the article object; SvelteKit route uses { success, data }.
			if (json && json.success === false) {
				throw new Error(typeof json.error === 'string' ? json.error : 'Article not found');
			}
			const a = (json?.data !== undefined ? json.data : json) as Record<string, unknown>;
			if (!a || typeof a !== 'object' || a._id == null || String(a._id).trim() === '') {
				throw new Error('Article not found');
			}

			formData = {
				title: asLangObj(a.title),
				category: String(a.category || ''),
				tags: Array.isArray(a.tags) ? (a.tags as string[]) : [],
				content: asLangObj(a.content),
				excerpt: asLangObj(a.excerpt),
				isPublished: Boolean(a.isPublished),
				isFeatured: Boolean(a.isFeatured),
				seoTitle: asLangObj(a.seoTitle),
				seoDescription: asLangObj(a.seoDescription),
				leadingImage:
					a.leadingImage && typeof a.leadingImage === 'object'
						? (a.leadingImage as BlogFormData['leadingImage'])
						: undefined
			};

			const cat = formData.category;
			if (cat && !categoryOptions.some((c) => c.alias === cat)) {
				const lang = get(currentLanguage);
				categoryOptions = [...categoryOptions, { alias: cat, title: cat }]
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
			}
		} catch (err) {
			error = handleError(err, 'Failed to load article');
		} finally {
			loading = false;
		}
	}

	function handleAddTag() {
		if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
			formData = { ...formData, tags: [...formData.tags, tagInput.trim()] };
			tagInput = '';
		}
	}

	function handleRemoveTag(tagToRemove: string) {
		formData = { ...formData, tags: formData.tags.filter((t) => t !== tagToRemove) };
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
			if (!formData.category.trim()) throw new Error($t('owner.categoryRequired'));
			if (!MultiLangUtils.getHTMLValue(formData.content, $currentLanguage).trim()) {
				throw new Error($t('owner.contentRequired'));
			}

			const payload = { ...formData };
			if (!payload.leadingImage?.url?.trim()) delete payload.leadingImage;

			const response = await fetch(`/api/admin/blog-articles/${articleId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			if (!response.ok) await handleApiErrorResponse(response);

			success = $t('admin.articleUpdatedSuccessfully');
			setTimeout(() => goto('/admin/blog-articles'), 1000);
		} catch (err) {
			error = handleError(err, $t('owner.failedToUpdate'));
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>{$t('admin.edit')} — {$t('admin.blogArticles')} — {$productName}</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen flex items-center justify-center bg-gray-50">
		<p class="text-gray-600">{$t('loading.loading')}</p>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 py-8">
		<div class="max-w-4xl mx-auto px-4">
			<div class="flex justify-between items-center mb-8">
				<h1 class="text-3xl font-bold text-gray-900">{$t('admin.edit')} — {$t('admin.blogArticles')}</h1>
				<button
					on:click={() => goto('/admin/blog-articles')}
					class="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
				>
					{$t('admin.backToBlogWorkspace')}
				</button>
			</div>

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
					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.basicInformation')}</h3>
						<div class="space-y-4">
							<div>
								<span class="block text-sm font-medium text-gray-700 mb-2">{$t('owner.title')} *</span>
								<MultiLangInput bind:value={formData.title} required />
							</div>
							<div>
								<label for="edit-article-category" class="block text-sm font-medium text-gray-700 mb-2"
									>{$t('owner.category')} *</label
								>
								<select
									id="edit-article-category"
									bind:value={formData.category}
									required
									class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
								<label for="edit-article-tags" class="block text-sm font-medium text-gray-700 mb-2"
									>{$t('owner.tags')}</label
								>
								<div class="flex">
									<input
										id="edit-article-tags"
										type="text"
										bind:value={tagInput}
										on:keypress={(e) => {
											if (e.key === 'Enter') {
												e.preventDefault();
												handleAddTag();
											}
										}}
										class="flex-1 px-3 py-2 border border-gray-300 rounded-l-md"
									/>
									<button type="button" on:click={handleAddTag} class="px-3 py-2 bg-blue-600 text-white rounded-r-md">
										{$t('owner.add')}
									</button>
								</div>
								{#if formData.tags.length > 0}
									<div class="mt-2 flex flex-wrap gap-2">
										{#each formData.tags as tag}
											<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
												{tag}
												<button type="button" on:click={() => handleRemoveTag(tag)} class="ml-1">×</button>
											</span>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</div>

					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.leadingImage')}</h3>
						<input
							type="url"
							value={formData.leadingImage?.url || ''}
							on:input={(e) => {
								formData.leadingImage = {
									url: e.currentTarget.value,
									alt: formData.leadingImage?.alt || { [$currentLanguage]: '' },
									storageProvider: formData.leadingImage?.storageProvider || 'local',
									storagePath: formData.leadingImage?.storagePath || ''
								};
							}}
							class="w-full px-3 py-2 border border-gray-300 rounded-md"
						/>
					</div>

					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.content')}</h3>
						<MultiLangInput bind:value={formData.excerpt} multiline={true} />
						<div class="mt-4">
							<MultiLangHTMLEditor bind:value={formData.content} height={300} />
						</div>
					</div>

					<div>
						<h3 class="text-lg font-medium text-gray-900 mb-4">{$t('owner.seo')}</h3>
						<MultiLangInput bind:value={formData.seoTitle} />
						<div class="mt-4">
							<MultiLangInput bind:value={formData.seoDescription} multiline={true} />
						</div>
					</div>

					<div class="space-y-3">
						<label class="flex items-center gap-2">
							<input type="checkbox" bind:checked={formData.isPublished} />
							<span>{$t('owner.publishArticle')}</span>
						</label>
						<label class="flex items-center gap-2">
							<input type="checkbox" bind:checked={formData.isFeatured} />
							<span>{$t('owner.featureArticle')}</span>
						</label>
					</div>

					<div class="flex justify-end">
						<button
							type="submit"
							disabled={saving}
							class="px-6 py-3 bg-green-600 text-white rounded-md disabled:opacity-50"
						>
							{saving ? $t('owner.saving') : $t('admin.saveChanges')}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
