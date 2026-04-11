<script lang="ts">
	import Layout from './Menu/Layout.svelte';

	/** PageBuilderGrid spreads `module.props` as attributes (see HeroModule); declare flat keys used by menu. */
	export let orientation: 'horizontal' | 'vertical' | undefined = undefined;
	export let props: any = undefined;

	$: rawBase = props?.config ?? props;
	$: base =
		rawBase && typeof rawBase === 'object' && !Array.isArray(rawBase)
			? (rawBase as Record<string, unknown>)
			: {};
	$: config = {
		...base,
		orientation: (base.orientation as 'horizontal' | 'vertical' | undefined) ?? orientation ?? 'horizontal'
	};
</script>

<Layout {config} />
