<script lang="ts">
	import Layout from './Logo/Layout.svelte';

	/**
	 * PageBuilderGrid spreads `module.props` as top-level attributes, not under `props`.
	 * Keep backward compatibility with nested `props.config`.
	 */
	export let size: 'sm' | 'md' | 'lg' | undefined = undefined;
	export let fallbackIcon: boolean | undefined = undefined;
	export let linkToHome: boolean | undefined = undefined;
	export let showSiteTitle: boolean | undefined = undefined;
	export let titlePosition: 'above' | 'below' | 'right' | 'left' | undefined = undefined;
	export let props: Record<string, unknown> | undefined = undefined;

	$: config = {
		...(props?.config && typeof props.config === 'object' ? (props.config as Record<string, unknown>) : {}),
		...(props ?? {}),
		...(size !== undefined ? { size } : {}),
		...(fallbackIcon !== undefined ? { fallbackIcon } : {}),
		...(linkToHome !== undefined ? { linkToHome } : {}),
		...(showSiteTitle !== undefined ? { showSiteTitle } : {}),
		...(titlePosition !== undefined ? { titlePosition } : {})
	};
</script>

<Layout {config} />
