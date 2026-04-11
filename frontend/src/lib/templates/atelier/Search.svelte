<script lang="ts">
	import './styles.scss';
	import { page } from '$app/stores';
	import { t } from '$stores/i18n';

	let initialQuery = $page.url.searchParams.get('q') || '';
</script>

<div
	class="flex-1 min-h-screen w-full pt-24 pb-16 bg-[color:var(--tp-canvas)] text-[color:var(--tp-fg)] [font-family:var(--os-font-body)]"
>
	<div class="max-w-[960px] mx-auto px-8 text-center">
		<h1
			class="text-[28px] font-normal tracking-[0.08em] text-[color:var(--tp-fg)] mb-2.5"
			style="font-family: var(--os-font-heading);"
		>
			{$t('navigation.search')}
		</h1>
		<div class="w-9 h-px mx-auto mb-6" style="background: var(--os-primary);"></div>
		<div
			class="text-left max-w-xl mx-auto border border-[color:var(--tp-border)] bg-[color:var(--tp-surface-1)] p-8 rounded-sm"
		>
			<p class="text-sm italic leading-relaxed mb-4" style="font-family: var(--os-font-heading); color: var(--tp-fg-muted);">
				Search is being updated. Advanced filters will be available soon.
			</p>
			{#if initialQuery}
				<p class="text-[10px] uppercase tracking-[0.16em] text-[color:var(--tp-fg-muted)]">
					Initial query: {initialQuery}
				</p>
			{/if}
		</div>
	</div>
</div>
