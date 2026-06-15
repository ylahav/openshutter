<!-- frontend/src/lib/page-builder/modules/RichTextModule.svelte -->
<script lang="ts">
	import Layout from './RichText/Layout.svelte';

	type RichTextProps = {
		title?: string | Record<string, string>;
		body?: string | Record<string, string>;
		background?: 'white' | 'gray' | 'transparent' | 'custom';
		/** Used when `background` is `custom`. */
		backgroundColor?: string;
	};

	type LegacyRichTextProps = {
		config?: RichTextProps;
	} & RichTextProps;

	let {
		title = undefined,
		body = '',
		background = 'white',
		backgroundColor = undefined,
		compact = false,
		props,
		data,
		...rest
	}: {
		title?: RichTextProps['title'];
		body?: RichTextProps['body'];
		background?: RichTextProps['background'];
		backgroundColor?: RichTextProps['backgroundColor'];
		compact?: boolean;
		props?: LegacyRichTextProps;
		data?: unknown;
		[key: string]: unknown;
	} = $props();

	const config = $derived.by((): RichTextProps => {
		if (props !== undefined) {
			return (props.config ??
				(props && typeof props === 'object' ? props : undefined) ?? {
					title,
					body,
					background,
					backgroundColor
				}) as RichTextProps;
		}
		const spread = rest as RichTextProps;
		if (
			spread.title !== undefined ||
			spread.body !== undefined ||
			spread.background !== undefined ||
			spread.backgroundColor !== undefined
		) {
			return spread;
		}
		return { title, body, background, backgroundColor };
	});
</script>

<Layout config={config} {compact} />
