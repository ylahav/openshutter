<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$lib/stores/language';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';

	interface PageData {
		_id: string;
		alias: string;
		title: string | { en?: string; he?: string };
		subtitle?: string | { en?: string; he?: string };
		introText?: string | { en?: string; he?: string };
		content: string | { en?: string; he?: string };
		category?: string;
		isPublished: boolean;
	}

	let pageData: PageData | null = null;
	let loading = true;
	let error: string | null = null;
	let alias = $page.url.searchParams.get('alias');

	onMount(async () => {
		if (alias) {
			await loadPage();
		}
	});

	$: if ($page.url.searchParams.get('alias') !== alias) {
		alias = $page.url.searchParams.get('alias');
		if (alias) {
			loadPage();
		}
	}

	async function loadPage() {
		if (!alias) {
			error = 'No page alias specified';
			loading = false;
			return;
		}

		try {
			loading = true;
			error = null;
			const response = await fetch(`/api/pages/${alias}`);
			if (!response.ok) {
				await handleApiErrorResponse(response);
			}
			const result = await response.json();
			if (result.success) {
				pageData = result.data;
				if (!pageData?.isPublished) {
					error = 'Page is not published';
				}
			} else {
				throw new Error(result.error || 'Page not found');
			}
		} catch (err) {
			logger.error('Failed to load page:', err);
			error = handleError(err, 'Failed to load page');
		} finally {
			loading = false;
		}
	}

	function getTextValue(value: string | { en?: string; he?: string } | undefined): string {
		if (!value) return '';
		if (typeof value === 'string') return value;
		return MultiLangUtils.getTextValue(value, $currentLanguage) || '';
	}

	function getHTMLValue(value: string | { en?: string; he?: string } | undefined): string {
		if (!value) return '';
		if (typeof value === 'string') return value;
		return MultiLangUtils.getHTMLValue(value, $currentLanguage) || '';
	}
</script>

<svelte:head>
	<title>{pageData ? getTextValue(pageData.title) : 'Page'} - OpenShutter</title>
</svelte:head>

<div class="min-h-screen flex flex-col bg-gray-50">
	<Header />

	{#if loading}
		<div class="flex-1 flex items-center justify-center">
			<div class="text-center">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
				<p class="mt-4 text-gray-600">Loading page...</p>
			</div>
		</div>
	{:else if error || !pageData}
		<div class="flex-1 flex items-center justify-center">
			<div class="text-center max-w-md mx-auto px-4">
				<h1 class="text-4xl font-bold text-gray-900 mb-4">Page Not Found</h1>
				<p class="text-gray-600 mb-6">
					{error || 'No page alias specified. Please provide a valid page alias.'}
				</p>
				<div class="space-x-4">
					<button
						on:click={() => goto('/')}
						class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
					>
						Go Home
					</button>
					<button
						on:click={() => goto('/albums')}
						class="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
					>
						View Gallery
					</button>
				</div>
			</div>
		</div>
	{:else}
		<main class="flex-1 py-8">
			<div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
				<article class="bg-white rounded-lg shadow-md p-8">
					<header class="mb-8">
						<h1 class="text-4xl font-bold text-gray-900 mb-4">{getTextValue(pageData.title)}</h1>
						{#if pageData.subtitle}
							<h2 class="text-2xl font-semibold text-gray-700 mb-4">
								{getTextValue(pageData.subtitle)}
							</h2>
						{/if}
						{#if pageData.introText}
							<div class="text-lg text-gray-600 mb-6">{@html getHTMLValue(pageData.introText)}</div>
						{/if}
					</header>

          <div class="prose max-w-none">{@html getHTMLValue(pageData.content)}</div>
				</article>
			</div>
		</main>
	{/if}

	<Footer />
</div>
