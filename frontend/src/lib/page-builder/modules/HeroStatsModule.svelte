<!-- frontend/src/lib/page-builder/modules/HeroStatsModule.svelte -->
<script lang="ts">
	import Layout from './HeroStats/Layout.svelte';

	type StatItem = {
		number?: string | number;
		label?: string | Record<string, string>;
	};

	type HeroStatsProps = {
		items?: StatItem[];
	};

	type LegacyHeroStatsProps = {
		config?: HeroStatsProps;
	} & HeroStatsProps;

	let {
		items = [],
		props,
		data,
		compact,
		...rest
	}: {
		items?: StatItem[];
		props?: LegacyHeroStatsProps;
		data?: unknown;
		compact?: boolean;
		[key: string]: unknown;
	} = $props();

	const config = $derived.by((): HeroStatsProps => {
		if (props !== undefined) {
			return (props.config ??
				(props && typeof props === 'object' ? props : undefined) ?? { items }) as HeroStatsProps;
		}
		const spread = rest as HeroStatsProps;
		if (Array.isArray(spread.items)) return spread;
		return { items };
	});
</script>

<Layout config={config} />
