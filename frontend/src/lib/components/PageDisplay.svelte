<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$utils/multiLang';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { logger } from '$lib/utils/logger';
	import { handleError, handleApiErrorResponse } from '$lib/utils/errorHandler';

	interface Page {
		_id: string;
		alias: string;
		title: string | { en?: string; he?: string };
		subtitle?: string | { en?: string; he?: string };
		introText?: string | { en?: string; he?: string };
		content: string | { en?: string; he?: string };
		category?: string;
		isPublished: boolean;
		createdAt?: string;
		updatedAt?: string;
		createdBy?: any;
		updatedBy?: any;
	}

	export let alias: string;

	let page: Page | null = null;
	let loading = true;
	let error: string | null = null;

	onMount(() => {
		fetchPage();
	});

	async function fetchPage() {
		try {
			loading = true;
			error = null;

			const response = await fetch(`/api/pages/${alias}`);
			if (response.ok) {
				const data = await response.json();
				if (data.success) {
					page = data.data;
				} else {
					error = data.error || 'Page not found';
				}
			} else if (response.status === 404) {
				error = 'Page not found';
			} else {
				error = 'Failed to load page';
			}
		} catch (err) {
			logger.error('Error fetching page:', err);
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

{#if loading}
	<div class="min-h-screen flex flex-col">
		<Header />
		<div class="flex-1 flex items-center justify-center">
			<div class="text-center">
				<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
				<p class="text-gray-600">Loading page...</p>
			</div>
		</div>
		<Footer />
	</div>
{:else if error || !page}
	<div class="min-h-screen flex flex-col">
		<Header />
		<div class="flex-1 flex items-center justify-center">
			<div class="text-center max-w-md mx-auto px-4">
				<h1 class="text-4xl font-bold text-gray-900 mb-4">Page Not Found</h1>
				<p class="text-gray-600 mb-6">
					{error || 'The page you are looking for does not exist or has been removed.'}
				</p>
				<div class="space-x-4">
					<button
						on:click={() => goto('/')}
						class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
					>
						<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 19l-7-7m0 0l7-7m-7 7h18"
							/>
						</svg>
						Go Home
					</button>
					<a
						href="/albums"
						class="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
					>
						View Albums
					</a>
				</div>
			</div>
		</div>
		<Footer />
	</div>
{:else}
	<div class="min-h-screen flex flex-col">
		<Header />
		<main class="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
			<!-- Back button -->
			<button
				on:click={() => goto('/')}
				class="mb-6 inline-flex items-center text-gray-600 hover:text-gray-900"
			>
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"
					/>
				</svg>
				Back to Home
			</button>

			<!-- Page content -->
			<article>
				{#if page.category}
					<span class="inline-block px-3 py-1 text-sm font-medium text-primary-600 bg-primary-50 rounded-full mb-4">
						{page.category}
					</span>
				{/if}

				<h1 class="text-4xl font-bold text-gray-900 mb-4">{getTextValue(page.title)}</h1>

				{#if page.subtitle}
					<p class="text-xl text-gray-600 mb-6">{getTextValue(page.subtitle)}</p>
				{/if}

				{#if page.introText}
					<div class="prose prose-lg mb-8">
						{@html getHTMLValue(page.introText)}
					</div>
				{/if}

				<div class="prose prose-lg max-w-none">
					{@html getHTMLValue(page.content)}
				</div>

				<!-- Metadata -->
				<div class="mt-8 pt-8 border-t border-gray-200 flex items-center gap-6 text-sm text-gray-500">
					{#if page.createdAt}
						<div class="flex items-center gap-2">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
							{new Date(page.createdAt).toLocaleDateString()}
						</div>
					{/if}
					{#if page.updatedAt && page.updatedAt !== page.createdAt}
						<div class="flex items-center gap-2">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
								/>
							</svg>
							Updated {new Date(page.updatedAt).toLocaleDateString()}
						</div>
					{/if}
				</div>
			</article>
		</main>
		<Footer />
	</div>
{/if}
