<script lang="ts">
	import { page } from '$app/stores';
	import Header from '$components/Header.svelte';
	import Footer from '$components/Footer.svelte';

	// Note: AdvancedFilterSearch component needs to be migrated to Svelte
	// For now, this is a placeholder that will be updated when search components are migrated
	let initialQuery = $page.url.searchParams.get('q') || '';
</script>

<Header />

<main class="flex-1 min-h-screen w-full">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<div class="bg-white dark:bg-gray-900/90 rounded-lg shadow-sm p-6 border border-transparent dark:border-gray-800">
			<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Search</h1>
			<p class="text-gray-600 dark:text-gray-400 mb-4">
				Search functionality is being migrated. Advanced filter search will be available soon.
			</p>
			{#if initialQuery}
				<p class="text-sm text-gray-500 dark:text-gray-400">Initial query: {initialQuery}</p>
			{/if}
		</div>
	</div>
</main>

<Footer />
