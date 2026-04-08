<script lang="ts">
	import { page } from '$app/stores';

	let initialQuery = $page.url.searchParams.get('q') || '';
</script>

<main
	class="flex-1 min-h-screen w-full pt-24 pb-16 bg-[color:var(--tp-canvas)] text-[color:var(--tp-fg)] [font-family:var(--os-font-body)]"
>
	<div class="max-w-6xl mx-auto px-6 lg:px-8">
		<div class="rounded-sm p-8 border bg-[color:var(--tp-surface-1)] border-[color:var(--tp-border)]">
			<h1 class="text-2xl font-extralight mb-4 tracking-tight" style="font-family: var(--os-font-heading);">
				Search
			</h1>
			<p class="text-sm mb-4 font-light text-[color:var(--tp-fg-muted)]">
				Search functionality is being migrated. Advanced filter search will be available soon.
			</p>
			{#if initialQuery}
				<p class="text-xs font-light text-[color:var(--tp-fg-muted)]">Initial query: {initialQuery}</p>
			{/if}
		</div>
	</div>
</main>
