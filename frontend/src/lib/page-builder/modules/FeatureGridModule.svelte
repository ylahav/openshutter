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

	export let title: NonNullable<FeatureGridProps['title']> = '';
	export let subtitle: FeatureGridProps['subtitle'] = undefined;
	export let features: NonNullable<FeatureGridProps['features']> = [];

	// Temporary migration fallback for legacy nested props.config payloads
	export let props: LegacyFeatureGridProps | undefined = undefined;
	$: config = (props?.config ??
		(props && typeof props === 'object' ? props : undefined) ?? {
			title,
			subtitle,
			features
		}) satisfies FeatureGridProps;
	const data = null;
	const templateConfig = {};
</script>

<Layout config={config} {data} {templateConfig} />
