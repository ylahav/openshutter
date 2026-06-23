<!-- frontend/src/lib/page-builder/modules/HeroStats/Layout.svelte -->
<script lang="ts">
	import { currentLanguage } from '$stores/language';
	import { MultiLangUtils } from '$lib/utils/multiLang';

	type StatItem = {
		number?: string | number;
		label?: string | Record<string, string>;
	};

	type HeroStatsConfig = {
		items?: StatItem[];
	};

	let { config = {} }: { config?: HeroStatsConfig } = $props();

	const items = $derived(Array.isArray(config?.items) ? config.items : []);

	function labelText(item: StatItem): string {
		return MultiLangUtils.getTextValue(item?.label, $currentLanguage) || '';
	}

	function numberText(item: StatItem): string {
		const n = item?.number;
		if (typeof n === 'number') return String(n);
		return typeof n === 'string' ? n : '';
	}
</script>

{#if items.length > 0}
	<div class="pb-hero-stats s-hero-stats">
		{#each items as item, i (i)}
			<div class="pb-hero-stats__item">
				<div class="pb-hero-stats__number s-stat-n">{numberText(item)}</div>
				<div class="pb-hero-stats__label s-stat-l">{labelText(item)}</div>
			</div>
		{/each}
	</div>
{/if}

<style lang="scss">
	.pb-hero-stats {
		display: flex;
		flex-wrap: wrap;
		gap: 28px;
		padding-top: 28px;
		border-top: 1px solid color-mix(in srgb, currentColor 14%, transparent);
	}
	.pb-hero-stats__number {
		font-weight: 700;
		font-size: 22px;
	}
	.pb-hero-stats__label {
		font-size: 11px;
		opacity: 0.7;
		margin-top: 2px;
	}
</style>
