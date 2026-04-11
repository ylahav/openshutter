<script lang="ts">
	import Layout from './Divider/Layout.svelte';

	type DividerThickness = 'thin' | 'medium';
	type DividerMargin = 'none' | 'sm' | 'md' | 'lg';
	type DividerLineStyle = 'solid' | 'dashed' | 'dotted';

	export let thickness: DividerThickness | undefined = undefined;
	export let margin: DividerMargin | undefined = undefined;
	export let lineStyle: DividerLineStyle | undefined = undefined;
	export let props: any = undefined;

	$: rawBase = props?.config ?? props;
	$: base =
		rawBase && typeof rawBase === 'object' && !Array.isArray(rawBase)
			? (rawBase as Record<string, unknown>)
			: {};
	$: config = {
		...base,
		thickness: (base.thickness as DividerThickness | undefined) ?? thickness ?? 'thin',
		margin: (base.margin as DividerMargin | undefined) ?? margin ?? 'sm',
		lineStyle: (base.lineStyle as DividerLineStyle | undefined) ?? lineStyle ?? 'solid'
	};
</script>

<Layout {config} />
