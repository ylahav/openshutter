<!--
  Photo module renderer. Single image with optional caption/credit and link.
  Uses the same image-serving pipeline as other modules (URL is passed through
  unchanged — typically /api/storage/serve/... or an uploaded site-asset URL).
-->
<script lang="ts">
	import { MultiLangUtils } from '$utils/multiLang';
	import { currentLanguage } from '$stores/i18n';
	import type { MultiLangText } from '$lib/types/multi-lang';

	type PhotoConfig = {
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

	let { config = {} }: { config?: PhotoConfig } = $props();

	const src = $derived(String(config.src ?? '').trim());

	const altText = $derived(
		MultiLangUtils.getTextValue(config.alt as MultiLangText | string | undefined, $currentLanguage) ||
			MultiLangUtils.getTextValue(
				config.caption as MultiLangText | string | undefined,
				$currentLanguage
			) ||
			''
	);

	const captionText = $derived(
		MultiLangUtils.getTextValue(
			config.caption as MultiLangText | string | undefined,
			$currentLanguage
		)
	);

	const creditText = $derived(
		MultiLangUtils.getTextValue(
			config.credit as MultiLangText | string | undefined,
			$currentLanguage
		)
	);

	const aspectClass = $derived.by(() => {
		switch (config.aspect) {
			case 'square':
				return 'aspect-square';
			case 'video':
				return 'aspect-video';
			case '4/3':
				return 'aspect-[4/3]';
			case '3/2':
				return 'aspect-[3/2]';
			case '21/9':
				return 'aspect-[21/9]';
			default:
				return '';
		}
	});

	const fitClass = $derived(config.fit === 'contain' ? 'object-contain' : 'object-cover');

	const roundedClass = $derived.by(() => {
		switch (config.rounded) {
			case 'sm':
				return 'rounded';
			case 'md':
				return 'rounded-md';
			case 'lg':
				return 'rounded-lg';
			case 'full':
				return 'rounded-full';
			default:
				return '';
		}
	});

	const blockAlignClass = $derived.by(() => {
		switch (config.align) {
			case 'left':
				return 'mr-auto';
			case 'right':
				return 'ml-auto';
			default:
				return 'mx-auto';
		}
	});

	const captionAlignClass = $derived.by(() => {
		switch (config.captionAlign) {
			case 'left':
				return 'text-left';
			case 'right':
				return 'text-right';
			default:
				return 'text-center';
		}
	});

	const maxWidthStyle = $derived(
		typeof config.maxWidth === 'string' && config.maxWidth.trim() !== ''
			? `max-width: ${config.maxWidth.trim()};`
			: ''
	);

	const hasLink = $derived(typeof config.href === 'string' && config.href.trim() !== '');
</script>

{#if src}
	<figure class="pb-photo {blockAlignClass}" style={maxWidthStyle}>
		{#if hasLink}
			<a
				href={config.href}
				target={config.target ?? '_self'}
				rel={config.target === '_blank' ? 'noopener noreferrer' : null}
				class="block"
			>
				<img
					{src}
					alt={altText}
					loading="lazy"
					class="w-full h-auto {aspectClass} {fitClass} {roundedClass}"
				/>
			</a>
		{:else}
			<img
				{src}
				alt={altText}
				loading="lazy"
				class="w-full h-auto {aspectClass} {fitClass} {roundedClass}"
			/>
		{/if}
		{#if captionText || creditText}
			<figcaption
				class="mt-2 text-sm text-(--color-surface-600-400) {captionAlignClass}"
			>
				{#if captionText}<span>{captionText}</span>{/if}
				{#if captionText && creditText}<span class="mx-1">·</span>{/if}
				{#if creditText}<span class="italic">{creditText}</span>{/if}
			</figcaption>
		{/if}
	</figure>
{:else}
	<div
		class="pb-photo pb-photo--empty w-full min-h-[120px] flex items-center justify-center rounded-md border border-dashed border-surface-300-700 bg-(--color-surface-100-900) text-xs text-(--color-surface-600-400)"
		aria-hidden="true"
	>
		Photo module: set an image URL or upload one in the module editor.
	</div>
{/if}
