<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import PageRenderer from '$lib/page-builder/PageRenderer.svelte';
	import { MultiLangUtils } from '$lib/utils/multiLang';
	import { currentLanguage } from '$stores/language';
	import type { PageData, PageModuleData } from '$lib/types/page-builder';

	export let data: {
		page: PageData | null;
		modules: PageModuleData[];
		error: string | null;
	};

	$: pageData = data.page;
	$: modules = data.modules || [];
	$: loadError = data.error;
	$: hasError = !!loadError || !pageData;

	function getTextValue(value: string | { en?: string; he?: string } | undefined): string {
		if (!value) return '';
		if (typeof value === 'string') return value;
		return MultiLangUtils.getTextValue(value, $currentLanguage) || '';
	}
</script>

<svelte:head>
	<title>{pageData ? getTextValue(pageData.title) : 'Page'} - OpenShutter</title>
</svelte:head>

<div class="min-h-screen flex flex-col">
	{#if hasError}
		<div class="flex-1 flex items-center justify-center py-16">
			<div class="text-center max-w-md mx-auto px-4">
				<h1 class="text-4xl font-bold text-gray-900 mb-4">Page Not Found</h1>
				<p class="text-gray-600 mb-6">
					{loadError || 'No page alias specified. Please provide a valid page alias.'}
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
		<PageRenderer page={pageData} modules={modules} />
	{/if}
</div>
