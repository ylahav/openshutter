<!-- frontend/src/lib/page-builder/modules/FeatureGridModule.svelte -->
<script lang="ts">
	import Layout from './FeatureGrid/Layout.svelte';

	type FeatureItem = {
		title: string | Record<string, string>;
		description: string | Record<string, string>;
		icon?: string;
	};

	type FeatureGridProps = {
		title?: string | Record<string, string>;
		subtitle?: string | Record<string, string>;
		features?: FeatureItem[];
	};

	type LegacyFeatureGridProps = {
		config?: FeatureGridProps;
	} & FeatureGridProps;

	let {
		title = '',
		subtitle = undefined,
		features = [],
		props,
		data,
		compact,
		...rest
	}: {
		title?: FeatureGridProps['title'];
		subtitle?: FeatureGridProps['subtitle'];
		features?: FeatureGridProps['features'];
		props?: LegacyFeatureGridProps;
		data?: unknown;
		compact?: boolean;
		[key: string]: unknown;
	} = $props();

	const config = $derived.by((): FeatureGridProps => {
		if (props !== undefined) {
			return (props.config ??
				(props && typeof props === 'object' ? props : undefined) ?? {
					title,
					subtitle,
					features
				}) as FeatureGridProps;
		}
		const spread = rest as FeatureGridProps;
		if (spread.title !== undefined || spread.features !== undefined || spread.subtitle !== undefined) {
			return spread;
		}
		return { title, subtitle, features };
	});
</script>

<Layout config={config} />
