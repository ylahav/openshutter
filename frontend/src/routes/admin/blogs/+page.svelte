<script lang="ts">
	import { t } from '$stores/i18n';
	import { productName } from '$stores/siteConfig';
</script>

<svelte:head>
	<title>{$t('admin.blogWorkspaceTitle')} - {$productName}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-4xl mx-auto px-4">
		<div class="mb-10">
			<a href="/admin" class="text-sm text-blue-600 hover:underline">{$t('admin.backToDashboard')}</a>
			<h1 class="text-3xl font-bold text-gray-900 mt-4">{$t('admin.blogWorkspaceTitle')}</h1>
			<p class="text-gray-600 mt-2">{$t('admin.blogWorkspaceSubtitle')}</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div class="bg-white rounded-lg shadow-md p-6 border border-gray-100">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-gray-900 ml-3">{$t('admin.blogCategories')}</h2>
				</div>
				<p class="text-gray-600 mb-4 text-sm">{$t('admin.manageBlogCategories')}</p>
				<a
					href="/admin/blog-categories"
					class="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
				>
					{$t('admin.manageBlogCategories')}
					<svg class="ml-2 w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</div>

			<div class="bg-white rounded-lg shadow-md p-6 border border-gray-100">
				<div class="flex items-center mb-4">
					<div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
						<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
							/>
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-gray-900 ml-3">{$t('admin.blogArticles')}</h2>
				</div>
				<p class="text-gray-600 mb-4 text-sm">{$t('admin.manageBlogArticlesCard')}</p>
				<a
					href="/admin/blog-articles"
					class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
				>
					{$t('admin.blogArticles')}
					<svg class="ml-2 w-4 h-4 rtl-flip" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</a>
			</div>
		</div>

		<p class="mt-8 text-sm text-gray-500">
			Public preview: <a class="text-blue-600 hover:underline" href="/blog">/blog</a>
		</p>
	</div>
</div>
