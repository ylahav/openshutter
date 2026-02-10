<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$lib/stores/language';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';
	import type { PageData } from './$types';

	export let data: PageData;

	interface BlogArticle {
		_id: string;
		title: string | { en?: string; he?: string };
		category: string;
		isPublished: boolean;
		createdAt: string;
		viewCount?: number;
		leadingImage?: {
			url: string;
			
		};
	}

	let articles: BlogArticle[] = [];
	let loading = true;
	let error: string | null = null;
	let searchTerm = '';
	let categoryFilter = '';
	let statusFilter = '';
	let categories: string[] = [];

	onMount(async () => {
		await fetchArticles();
	});

	async function fetchArticles() {
		try {
			loading = true;
			const params = new URLSearchParams();
			if (searchTerm) params.append('search', searchTerm);
			if (categoryFilter) params.append('category', categoryFilter);
			if (statusFilter) params.append('isPublished', statusFilter);

			const response = await fetch(`/api/owner/blog?${params.toString()}`);
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			const result = await response.json();
			if (result.success) {
				articles = result.data || [];
				const uniqueCategories = [
					...new Set(articles.map((article: BlogArticle) => article.category))
				] as string[];
				categories = uniqueCategories;
			}
		} catch (err) {
			logger.error('Failed to fetch articles:', err);
			error = handleError(err, 'Failed to fetch articles');
		} finally {
			loading = false;
		}
	}

	async function handleDelete(articleId: string) {
		if (!confirm('Are you sure you want to delete this article?')) return;

		try {
			const response = await fetch(`/api/owner/blog/${articleId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				await handleApiErrorResponse(response);
			}

			articles = articles.filter((article) => article._id !== articleId);
		} catch (err) {
			logger.error('Failed to delete article:', err);
			error = handleError(err, 'Failed to delete article');
		}
	}

	async function handleTogglePublish(article: BlogArticle) {
		try {
			const response = await fetch(`/api/owner/blog/${article._id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					...article,
					isPublished: !article.isPublished
				})
			});

			if (!response.ok) {
				throw new Error('Failed to update article');
			}

			const result = await response.json();
			if (result.success) {
				articles = articles.map((a) =>
					a._id === article._id ? { ...a, isPublished: !a.isPublished } : a
				);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update article';
		}
	}
</script>

<svelte:head>
	<title>Blog Management - Owner</title>
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
		<div class="max-w-6xl mx-auto px-4">
			<!-- Header -->
			<div class="flex justify-between items-center mb-8">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Blog Management</h1>
					<p class="text-gray-600 mt-2">Manage your blog articles</p>
				</div>
				<div class="flex space-x-3">
					<button
						on:click={() => goto('/owner/blog/new')}
						class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
					>
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						Create New Article
					</button>
					<button
						on:click={() => goto('/owner')}
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
						Back to Dashboard
					</button>
				</div>
			</div>

			<!-- Filters -->
			<div class="bg-white rounded-lg shadow-md p-6 mb-6">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label for="search" class="block text-sm font-medium text-gray-700 mb-2">
							Search Articles
						</label>
						<input
							type="text"
							id="search"
							bind:value={searchTerm}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							placeholder="Search..."
						/>
					</div>
					<div>
						<label for="category" class="block text-sm font-medium text-gray-700 mb-2"> Category </label>
						<select
							id="category"
							bind:value={categoryFilter}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
						>
							<option value="">All Categories</option>
							{#each categories as category}
								<option value={category}>{category}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="status" class="block text-sm font-medium text-gray-700 mb-2"> Status </label>
						<select
							id="status"
							bind:value={statusFilter}
							class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
						>
							<option value="">All Statuses</option>
							<option value="true">Published</option>
							<option value="false">Draft</option>
						</select>
					</div>
				</div>
				<div class="mt-4">
					<button
						on:click={fetchArticles}
						class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
					>
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
						Filter
					</button>
				</div>
			</div>

			<!-- Error Message -->
			{#if error}
				<div class="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
					<p class="text-sm text-red-800">{error}</p>
				</div>
			{/if}

			<!-- Articles List -->
			<div class="bg-white rounded-lg shadow-md">
				{#if articles.length === 0}
					<div class="text-center py-12">
						<svg
							class="mx-auto h-12 w-12 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
							/>
						</svg>
						<h3 class="mt-2 text-sm font-medium text-gray-900">No articles</h3>
						<p class="mt-1 text-sm text-gray-500">Get started by creating your first article</p>
						<div class="mt-6">
							<button
								on:click={() => goto('/owner/blog/new')}
								class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
							>
								<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 4v16m8-8H4"
									/>
								</svg>
								Create New Article
							</button>
						</div>
					</div>
				{:else}
					<div class="overflow-hidden">
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Title
									</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Category
									</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Status
									</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Created
									</th>
									<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
										Views
									</th>
									<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
										Actions
									</th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								{#each articles as article}
									<tr class="hover:bg-gray-50">
										<td class="px-6 py-4 whitespace-nowrap">
											<div class="flex items-center">
												<div class="shrink-0 h-10 w-10">
													{#if article.leadingImage}
														<img
															class="h-10 w-10 rounded-lg object-cover"
															src={article.leadingImage.url}
															alt={MultiLangUtils.getTextValue(article.leadingImage.alt, $currentLanguage)}
														/>
													{:else}
														<div
															class="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center"
														>
															<svg
																class="h-6 w-6 text-gray-400"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	stroke-width="2"
																	d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
																/>
															</svg>
														</div>
													{/if}
												</div>
												<div class="ml-4">
													<div class="text-sm font-medium text-gray-900">
														{MultiLangUtils.getTextValue(article.title, $currentLanguage)}
													</div>
												</div>
											</div>
										</td>
										<td class="px-6 py-4 whitespace-nowrap">
											<span
												class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
											>
												{article.category}
											</span>
										</td>
										<td class="px-6 py-4 whitespace-nowrap">
											<span
												class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {article.isPublished
													? 'bg-green-100 text-green-800'
													: 'bg-yellow-100 text-yellow-800'}"
											>
												{article.isPublished ? 'Published' : 'Draft'}
											</span>
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{new Date(article.createdAt).toLocaleDateString()}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
											{article.viewCount || 0}
										</td>
										<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
											<div class="flex justify-end space-x-2">
												<button
													on:click={() => handleTogglePublish(article)}
													class="{article.isPublished
														? 'text-yellow-600 hover:text-yellow-900'
														: 'text-green-600 hover:text-green-900'}"
												>
													{article.isPublished ? 'Unpublish' : 'Publish'}
												</button>
												<button
													on:click={() => handleDelete(article._id)}
													class="text-red-600 hover:text-red-900"
												>
													Delete
												</button>
											</div>
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
