<script lang="ts">
	import { page } from '$app/stores';

	let initialQuery = $page.url.searchParams.get('q') || '';
</script>

<main class="flex-1 min-h-screen bg-white">
	<div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
		<div class="bg-white border border-black p-6">
			<h1 class="text-2xl font-light text-black mb-4 tracking-tight">Search</h1>
			<p class="text-sm text-gray-600 mb-4">
				Search functionality is being migrated. Advanced filter search will be available soon.
			</p>
			{#if initialQuery}
				<p class="text-xs text-gray-500">Initial query: {initialQuery}</p>
			{/if}
		</div>
	</div>
</main>
