<script lang="ts">
	import Layout from './Logo/Layout.svelte';

	/**
	 * PageBuilderGrid spreads `module.props` as top-level attributes, not under `props`.
	 * Keep backward compatibility with nested `props.config`.
	 */
	let {
		size = undefined,
		fallbackIcon = undefined,
		linkToHome = undefined,
		showSiteTitle = undefined,
		titlePosition = undefined,
		props,
		data,
		compact,
		...rest
	}: {
		size?: 'sm' | 'md' | 'lg';
		fallbackIcon?: boolean;
		linkToHome?: boolean;
		showSiteTitle?: boolean;
		titlePosition?: 'above' | 'below' | 'right' | 'left';
		props?: Record<string, unknown>;
		data?: unknown;
		compact?: boolean;
		[key: string]: unknown;
	} = $props();

	const config = $derived({
		...(props?.config && typeof props.config === 'object' ? (props.config as Record<string, unknown>) : {}),
		...(props ?? {}),
		...rest,
		...(size !== undefined ? { size } : {}),
		...(fallbackIcon !== undefined ? { fallbackIcon } : {}),
		...(linkToHome !== undefined ? { linkToHome } : {}),
		...(showSiteTitle !== undefined ? { showSiteTitle } : {}),
		...(titlePosition !== undefined ? { titlePosition } : {})
	});
</script>

<Layout {config} />
