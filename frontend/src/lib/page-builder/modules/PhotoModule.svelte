<!--
  PhotoModule — page-builder adapter for a single configurable photo (uploaded
  asset, manual URL, or — later — a picked album photo). PageRenderer spreads
  `module.props` as top-level attributes; this adapter accepts both the flat
  shape and a legacy `props.config` envelope, defaults missing fields, and
  delegates to `Photo/Layout.svelte`.
-->
<script lang="ts">
	import Layout from './Photo/Layout.svelte';
	import type { MultiLangText } from '$lib/types/multi-lang';

	export type PhotoModuleProps = {
		src?: string;
		alt?: string | MultiLangText;
		caption?: string | MultiLangText;
		credit?: string | MultiLangText;
		href?: string;
		target?: '_self' | '_blank';
		aspect?: 'auto' | 'square' | 'video' | '4/3' | '3/2' | '21/9';
		fit?: 'cover' | 'contain';
		rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
		align?: 'left' | 'center' | 'right';
		maxWidth?: string;
		captionAlign?: 'left' | 'center' | 'right';
	};

	type LegacyPhotoProps = { config?: PhotoModuleProps } & PhotoModuleProps;

	let {
		src = '',
		alt = '',
		caption = '',
		credit = '',
		href = '',
		target = '_self',
		aspect = 'auto',
		fit = 'cover',
		rounded = 'none',
		align = 'center',
		maxWidth = '',
		captionAlign = 'center',
		props,
		data: _data,
		compact: _compact,
		...rest
	}: PhotoModuleProps & {
		props?: LegacyPhotoProps;
		data?: unknown;
		compact?: boolean;
		[key: string]: unknown;
	} = $props();

	const config = $derived.by((): PhotoModuleProps => {
		if (props && typeof props === 'object') {
			return (props.config ?? props) as PhotoModuleProps;
		}
		const spread = rest as Partial<PhotoModuleProps>;
		const flat: PhotoModuleProps = {
			src,
			alt,
			caption,
			credit,
			href,
			target,
			aspect,
			fit,
			rounded,
			align,
			maxWidth,
			captionAlign,
			...spread
		};
		return flat;
	});
</script>

<Layout {config} />
