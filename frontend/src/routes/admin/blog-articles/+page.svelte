<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$lib/stores/language';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import { t } from '$stores/i18n';
	import { productName } from '$stores/siteConfig';
	import { adminToast } from '$lib/admin/adminToast';
	import { adminBtnPrimarySm, adminRingPrimary } from '$lib/admin/admin-cerberus';
	import AdminConfirmDialog from '$lib/components/admin/AdminConfirmDialog.svelte';
	interface BlogArticleRow {
		_id: string;
		title: string | { en?: string; he?: string };
		category: string;
		isPublished: boolean;
		createdAt: string;
		viewCount?: number;
		slug?: string;
		leadingImage?: { url: string; alt?: string | { en?: string; he?: string } };
	}

	let articles: BlogArticleRow[] = [];
	let categoryOptions: string[] = [];
	let loading = true;
	let searchTerm = '';
	let categoryFilter = '';
	let statusFilter = '';

	let deleteArticleDialog: {
		isOpen: boolean;
		articleId: string | null;
		isDeleting: boolean;
	} = {
		isOpen: false,
		articleId: null,
		isDeleting: false,
	};

	onMount(async () => {
		await Promise.all([loadCategoryOptions(), fetchArticles()]);
	});

	async function loadCategoryOptions() {
		try {
			const res = await fetch('/api/admin/blog-categories?limit=200');
			if (!res.ok) return;
			const json = await res.json();
			const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
			categoryOptions = rows
				.map((c: { alias?: string }) => String(c.alias || '').trim())
				.filter(Boolean);
		} catch (e) {
			logger.warn('Failed to load category list:', e);
		}
	}

	async function fetchArticles() {
		try {
			loading = true;
			const params = new URLSearchParams();
			if (searchTerm) params.set('search', searchTerm);
			if (categoryFilter) params.set('category', categoryFilter);
			if (statusFilter) params.set('isPublished', statusFilter);

			const response = await fetch(`/api/admin/blog-articles?${params.toString()}`);
			if (!response.ok) await handleApiErrorResponse(response);

			const result = await response.json();
			articles = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
		} catch (err) {
			logger.error('Failed to fetch articles:', err);
			adminToast.error({ title: handleError(err, $t('owner.requestFailed')) });
		} finally {
			loading = false;
		}
	}

	function openDeleteArticleDialog(articleId: string) {
		deleteArticleDialog = { isOpen: true, articleId, isDeleting: false };
	}

	function closeDeleteArticleDialog() {
		deleteArticleDialog = { isOpen: false, articleId: null, isDeleting: false };
	}

	async function confirmDeleteArticle() {
		const id = deleteArticleDialog.articleId;
		if (!id || deleteArticleDialog.isDeleting) return;
		deleteArticleDialog = { ...deleteArticleDialog, isDeleting: true };
		try {
			const response = await fetch(`/api/admin/blog-articles/${id}`, { method: 'DELETE' });
			if (!response.ok) await handleApiErrorResponse(response);
			articles = articles.filter((a) => a._id !== id);
			closeDeleteArticleDialog();
		} catch (err) {
			adminToast.error({ title: handleError(err, $t('owner.failedToDelete')) });
			deleteArticleDialog = { ...deleteArticleDialog, isDeleting: false };
		}
	}

	async function handleTogglePublish(article: BlogArticleRow) {
		try {
			const response = await fetch(`/api/admin/blog-articles/${article._id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isPublished: !article.isPublished })
			});
			if (!response.ok) await handleApiErrorResponse(response);
			const result = await response.json();
			const updatedArticle = (result && result.data) ? result.data : result;
			articles = articles.map((a) =>
				a._id === article._id
					? { ...a, isPublished: Boolean((updatedArticle as { isPublished?: boolean })?.isPublished ?? !a.isPublished) }
					: a
			);
		} catch (err) {
			adminToast.error({ title: handleError(err, $t('owner.failedToUpdate')) });
		}
	}

	function thumbAlt(a: BlogArticleRow): string {
		if (!a.leadingImage?.alt) return MultiLangUtils.getTextValue(a.title, $currentLanguage);
		return MultiLangUtils.getTextValue(a.leadingImage.alt, $currentLanguage);
	}
</script>

<svelte:head>
	<title>{$t('admin.blogArticles')} - {$productName}</title>
</svelte:head>

{#if loading}
	<div class="min-h-[50vh] flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-(--color-primary-600) mx-auto"></div>
			<p class="mt-4 text-(--color-surface-600-400)">{$t('loading.loading')}</p>
		</div>
	</div>
{:else}
	<div class="py-8">
		<div class="max-w-6xl mx-auto px-4">
			<div class="flex justify-between items-center mb-8 flex-wrap gap-4">
				<div>
					<h1 class="text-3xl font-bold text-(--color-surface-950-50)">{$t('admin.blogArticles')}</h1>
					<p class="text-(--color-surface-600-400) mt-2">{$t('admin.manageBlogArticlesCard')}</p>
				</div>
				<div class="flex flex-wrap gap-3">
					<button
						type="button"
						on:click={() => goto('/admin/blog-articles/new')}
						class="{adminBtnPrimarySm} {adminRingPrimary} inline-flex items-center"
					>
						{$t('owner.createNewArticle')}
					</button>
					<button
						on:click={() => goto('/admin/blogs')}
						class="btn preset-filled-primary-500 inline-flex items-center"
					>
						{$t('admin.backToBlogWorkspace')}
					</button>
				</div>
			</div>

			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 p-6 mb-6">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label for="search-art" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('owner.searchArticles')}
						</label>
						<input
							id="search-art"
							type="text"
							bind:value={searchTerm}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md"
							placeholder={$t('owner.searchPlaceholder')}
						/>
					</div>
					<div>
						<label for="cat-art" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('owner.category')}
						</label>
						<select
							id="cat-art"
							bind:value={categoryFilter}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md"
						>
							<option value="">{$t('owner.allCategories')}</option>
							{#each categoryOptions as c}
								<option value={c}>{c}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="st-art" class="block text-sm font-medium text-(--color-surface-800-200) mb-2">
							{$t('owner.status')}
						</label>
						<select
							id="st-art"
							bind:value={statusFilter}
							class="w-full px-3 py-2 border border-surface-300-700 rounded-md"
						>
							<option value="">{$t('owner.allStatuses')}</option>
							<option value="true">{$t('owner.published')}</option>
							<option value="false">{$t('owner.draft')}</option>
						</select>
					</div>
				</div>
				<button
					type="button"
					on:click={fetchArticles}
					class="{adminBtnPrimarySm} {adminRingPrimary} mt-4 inline-flex items-center"
				>
					{$t('owner.filter')}
				</button>
			</div>

			<div class="card preset-outlined-surface-200-800 bg-surface-50-950 overflow-hidden">
				{#if articles.length === 0}
					<div class="text-center py-12 text-(--color-surface-600-400)">
						<p class="mb-4">{$t('owner.noArticles')}</p>
						<button
							type="button"
							on:click={() => goto('/admin/blog-articles/new')}
							class="{adminBtnPrimarySm} {adminRingPrimary} inline-flex items-center"
						>
							{$t('owner.createNewArticle')}
						</button>
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="min-w-full divide-y divide-surface-200-800">
							<thead class="bg-(--color-surface-50-950)">
								<tr>
									<th class="px-4 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase">Title</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase">
										Category
									</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase">Status</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase">Created</th>
									<th class="px-4 py-3 text-left text-xs font-medium text-(--color-surface-600-400) uppercase">Views</th>
									<th class="px-4 py-3 text-right text-xs font-medium text-(--color-surface-600-400) uppercase">Actions</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-surface-200-800">
								{#each articles as article}
									<tr class="hover:bg-(--color-surface-50-950)">
										<td class="px-4 py-3">
											<div class="flex items-center gap-3">
												{#if article.leadingImage?.url}
													<img
														src={article.leadingImage.url}
														alt={thumbAlt(article)}
														class="h-10 w-10 rounded-lg object-cover shrink-0"
													/>
												{/if}
												<span class="text-sm font-medium text-(--color-surface-950-50)">
													{MultiLangUtils.getTextValue(article.title, $currentLanguage)}
												</span>
											</div>
										</td>
										<td class="px-4 py-3 text-sm">{article.category}</td>
										<td class="px-4 py-3">
											<span
												class="inline-flex px-2 py-0.5 rounded-full text-xs font-medium border {article.isPublished
													? 'border-[color-mix(in_oklab,var(--color-success-500)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-success-500)_14%,transparent)] text-(--color-success-900)'
													: 'border-[color-mix(in_oklab,var(--color-warning-500)_40%,transparent)] bg-[color-mix(in_oklab,var(--color-warning-500)_14%,transparent)] text-(--color-warning-900)'}"
											>
												{article.isPublished ? 'Published' : 'Draft'}
											</span>
										</td>
										<td class="px-4 py-3 text-sm text-(--color-surface-600-400)">
											{new Date(article.createdAt).toLocaleDateString()}
										</td>
										<td class="px-4 py-3 text-sm text-(--color-surface-600-400)">{article.viewCount ?? 0}</td>
										<td class="px-4 py-3 text-right text-sm space-x-2">
											{#if article.slug}
												<a
													href="/blog/{article.slug}"
													target="_blank"
													rel="noopener noreferrer"
													class="text-(--color-primary-600) hover:underline"
												>
													View
												</a>
											{/if}
											<button
												type="button"
												on:click={() => goto(`/admin/blog-articles/${article._id}/edit`)}
												class="text-indigo-600 hover:underline"
											>
												{$t('admin.edit')}
											</button>
											<button
												type="button"
												on:click={() => handleTogglePublish(article)}
												class={article.isPublished ? 'text-yellow-700 hover:underline' : 'text-green-700 hover:underline'}
											>
												{article.isPublished ? 'Unpublish' : 'Publish'}
											</button>
											<button
												type="button"
												on:click={() => openDeleteArticleDialog(article._id)}
												class="text-red-600 hover:underline"
											>
												{$t('admin.delete')}
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<AdminConfirmDialog
	open={deleteArticleDialog.isOpen}
	title={$t('admin.delete')}
	message={$t('owner.confirmDeleteArticle')}
	confirmText={deleteArticleDialog.isDeleting ? $t('admin.deleting') : $t('admin.delete')}
	cancelText={$t('admin.cancel')}
	variant="danger"
	confirmDisabled={deleteArticleDialog.isDeleting}
	onOpenChange={(o) => {
		if (!o) closeDeleteArticleDialog();
	}}
	onConfirm={confirmDeleteArticle}
/>
