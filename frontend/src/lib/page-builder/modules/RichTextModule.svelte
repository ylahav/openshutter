<!-- frontend/src/lib/page-builder/modules/RichTextModule.svelte -->
<script lang="ts">
	import Layout from './RichText/Layout.svelte';

	type RichTextProps = {
		title?: string | Record<string, string>;
		body?: string | Record<string, string>;
		background?: 'white' | 'gray' | 'transparent';
	};

	type LegacyRichTextProps = {
		config?: RichTextProps;
	} & RichTextProps;

	export let title: RichTextProps['title'] = undefined;
	export let body: NonNullable<RichTextProps['body']> = '';
	export let background: NonNullable<RichTextProps['background']> = 'white';
	export let compact: boolean = false;

	// Temporary migration fallback for legacy nested props.config payloads
	export let props: LegacyRichTextProps | undefined = undefined;
	$: config = (props?.config ??
		(props && typeof props === 'object' ? props : undefined) ?? {
			title,
			body,
			background
		}) satisfies RichTextProps;
	const data = null;
	const templateConfig = {};
</script>

<Layout config={config} {data} {templateConfig} {compact} />
