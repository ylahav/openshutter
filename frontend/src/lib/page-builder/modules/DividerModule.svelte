<script lang="ts">
	import Layout from './Divider/Layout.svelte';

	type DividerThickness = 'thin' | 'medium';
	type DividerMargin = 'none' | 'sm' | 'md' | 'lg';
	type DividerLineStyle = 'solid' | 'dashed' | 'dotted';

	let {
		thickness = undefined,
		margin = undefined,
		lineStyle = undefined,
		props,
		data,
		compact,
		...rest
	}: {
		thickness?: DividerThickness;
		margin?: DividerMargin;
		lineStyle?: DividerLineStyle;
		props?: Record<string, unknown>;
		data?: unknown;
		compact?: boolean;
		[key: string]: unknown;
	} = $props();

	const config = $derived.by(() => {
		const rawBase = props?.config ?? props ?? rest;
		const base =
			rawBase && typeof rawBase === 'object' && !Array.isArray(rawBase)
				? (rawBase as Record<string, unknown>)
				: {};
		return {
			...base,
			thickness: (base.thickness as DividerThickness | undefined) ?? thickness ?? 'thin',
			margin: (base.margin as DividerMargin | undefined) ?? margin ?? 'sm',
			lineStyle: (base.lineStyle as DividerLineStyle | undefined) ?? lineStyle ?? 'solid'
		};
	});
</script>

<Layout {config} />
