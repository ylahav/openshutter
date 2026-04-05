<script lang="ts">
	import { page } from '$app/stores';

	let initialQuery = $page.url.searchParams.get('q') || '';
</script>

<main class="flex-1 min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-slate-950 dark:to-neutral-950">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
		<div class="bg-white dark:bg-gray-900/90 rounded-xl shadow-lg p-8 border border-purple-100 dark:border-purple-900/50">
			<h1 class="text-3xl font-serif text-gray-900 dark:text-gray-100 mb-4 tracking-wide" style="font-family: 'Playfair Display', serif;">
				Search
			</h1>
			<p class="text-sm text-gray-600 dark:text-gray-400 mb-4 font-light">
				Search functionality is being migrated. Advanced filter search will be available soon.
			</p>
			{#if initialQuery}
				<p class="text-xs text-gray-500 dark:text-gray-400 font-light">Initial query: {initialQuery}</p>
			{/if}
		</div>
	</div>
</main>
