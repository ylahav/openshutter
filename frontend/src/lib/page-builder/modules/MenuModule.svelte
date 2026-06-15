<script lang="ts">
	import Layout from './Menu/Layout.svelte';
	import { siteConfigData } from '$stores/siteConfig';

	/** PageBuilderGrid spreads `module.props` as attributes (see HeroModule); declare flat keys used by menu. */
	let {
		orientation = undefined,
		instanceRef = undefined,
		props,
		data,
		compact,
		...rest
	}: {
		orientation?: 'horizontal' | 'vertical';
		instanceRef?: string;
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
		const resolvedRef = String((base.instanceRef ?? instanceRef ?? '') || '').trim();
		const templateBag = ($siteConfigData?.template ?? {}) as Record<string, unknown>;
		const menuInstances = (templateBag.menuInstances ?? {}) as Record<string, Record<string, unknown>>;
		const instanceConfig =
			resolvedRef && menuInstances && menuInstances[resolvedRef] ? menuInstances[resolvedRef] : {};
		return {
			...instanceConfig,
			...base,
			orientation: (base.orientation as 'horizontal' | 'vertical' | undefined) ?? orientation ?? 'horizontal'
		};
	});
</script>

<Layout {config} />
