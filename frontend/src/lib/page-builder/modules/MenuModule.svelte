<script lang="ts">
	import Layout from './Menu/Layout.svelte';
	import { siteConfigData } from '$stores/siteConfig';

	/** PageBuilderGrid spreads `module.props` as attributes (see HeroModule); declare flat keys used by menu. */
	export let orientation: 'horizontal' | 'vertical' | undefined = undefined;
	export let instanceRef: string | undefined = undefined;
	export let props: any = undefined;

	$: rawBase = props?.config ?? props;
	$: base =
		rawBase && typeof rawBase === 'object' && !Array.isArray(rawBase)
			? (rawBase as Record<string, unknown>)
			: {};
	$: resolvedRef = String((base.instanceRef ?? instanceRef ?? '') || '').trim();
	$: templateBag = ($siteConfigData?.template ?? {}) as Record<string, unknown>;
	$: menuInstances = ((templateBag.menuInstances ?? {}) as Record<string, Record<string, unknown>>);
	$: instanceConfig = resolvedRef && menuInstances && menuInstances[resolvedRef]
		? menuInstances[resolvedRef]
		: {};
	$: config = {
		...instanceConfig,
		...base,
		orientation: (base.orientation as 'horizontal' | 'vertical' | undefined) ?? orientation ?? 'horizontal'
	};
</script>

<Layout {config} />
