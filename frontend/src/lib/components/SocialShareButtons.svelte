<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';

	export type ShareOptionKey = 'twitter' | 'facebook' | 'whatsapp' | 'copy';

	let {
		url = null,
		title = null,
		size = 'sm',
		options: optionsProp = null
	}: {
		url?: string | null;
		title?: string | null;
		size?: 'sm' | 'md';
		/** Override which buttons to show; if null/undefined, use site config sharingOptions (empty = all). */
		options?: ShareOptionKey[] | null;
	} = $props();

	let resolvedUrl = $state('');
	let copied = $state(false);

	$effect(() => {
		if (url) {
			resolvedUrl = url;
		} else if (typeof window !== 'undefined') {
			resolvedUrl = window.location.href;
		} else {
			resolvedUrl = '';
		}
	});

	let encodedUrl = $derived(resolvedUrl ? encodeURIComponent(resolvedUrl) : '');
	let encodedTitle = $derived(title ? encodeURIComponent(title) : '');

	const ALL_OPTIONS: ShareOptionKey[] = ['twitter', 'facebook', 'whatsapp', 'copy'];
	let enabledOptions = $derived(
		optionsProp != null
			? optionsProp
			: ($siteConfigData?.features?.sharingOptions?.length
				? ($siteConfigData.features.sharingOptions as ShareOptionKey[])
				: ALL_OPTIONS)
	);

	function openShareWindow(shareUrl: string) {
		if (!shareUrl) return;
		if (typeof window === 'undefined') return;
		window.open(shareUrl, '_blank', 'noopener,noreferrer,width=700,height=500');
	}

	async function copyLink() {
		if (!resolvedUrl) return;
		try {
			if (navigator?.clipboard?.writeText) {
				await navigator.clipboard.writeText(resolvedUrl);
				copied = true;
				setTimeout(() => (copied = false), 2000);
			}
		} catch {
			// Ignore copy errors
		}
	}

	// Circular icon buttons — one identifiable glyph per platform. Text labels
	// (Share, Copy link) show as tooltips on desktop; on mobile the icon speaks
	// for itself and there's no room for text next to it.
	let btnClasses = $derived(
		size === 'md'
			? 'inline-flex items-center justify-center h-10 w-10 rounded-full border border-gray-300 bg-white/95 hover:bg-white text-gray-700 shadow-sm transition-colors'
			: 'inline-flex items-center justify-center h-9 w-9 rounded-full border border-gray-300 bg-white/95 hover:bg-white text-gray-700 shadow-sm transition-colors'
	);
	let iconClasses = $derived(size === 'md' ? 'h-5 w-5' : 'h-4 w-4');
</script>

{#if resolvedUrl}
	<div class="flex flex-wrap items-center gap-2">
		{#if enabledOptions.includes('twitter')}
			<button
				type="button"
				class={btnClasses}
				onclick={() =>
					openShareWindow(
						`https://twitter.com/intent/tweet?url=${encodedUrl}${encodedTitle ? `&text=${encodedTitle}` : ''}`
					)}
				aria-label="Share on X (Twitter)"
				title="Share on X"
			>
				<!-- X logo -->
				<svg class="{iconClasses} share-icon" viewBox="0 0 24 24" fill="#374151" aria-hidden="true">
					<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
				</svg>
			</button>
		{/if}
		{#if enabledOptions.includes('facebook')}
			<button
				type="button"
				class={btnClasses}
				onclick={() => openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
				aria-label="Share on Facebook"
				title="Share on Facebook"
			>
				<!-- Facebook f -->
				<svg class="{iconClasses} share-icon" viewBox="0 0 24 24" fill="#374151" aria-hidden="true">
					<path d="M13.5 21v-8h2.5l.5-3.5h-3V7.25c0-1 .25-1.75 1.75-1.75H16.75V2.5c-.35-.05-1.5-.15-2.85-.15C11.05 2.35 9.5 4 9.5 6.75V9.5H7V13h2.5v8h4Z" />
				</svg>
			</button>
		{/if}
		{#if enabledOptions.includes('whatsapp')}
			<button
				type="button"
				class={btnClasses}
				onclick={() =>
					openShareWindow(
						`https://api.whatsapp.com/send?text=${encodedTitle ? `${encodedTitle}%20-%20` : ''}${encodedUrl}`
					)}
				aria-label="Share on WhatsApp"
				title="Share on WhatsApp"
			>
				<!-- WhatsApp -->
				<svg class="{iconClasses} share-icon" viewBox="0 0 24 24" fill="#374151" aria-hidden="true">
					<path d="M17.6 6.3A7.9 7.9 0 0 0 12 4a7.9 7.9 0 0 0-6.8 11.9L4 20l4.2-1.1a7.9 7.9 0 0 0 3.8 1h.001a7.9 7.9 0 0 0 6.8-11.9c-.3-.6-.7-1.1-1.2-1.7Zm-5.6 12.3h-.001a6.6 6.6 0 0 1-3.3-.9l-.2-.1-2.4.6.6-2.4-.2-.2A6.6 6.6 0 1 1 12 18.6Zm3.6-4.9c-.2-.1-1.2-.6-1.4-.6s-.3-.1-.4.1c-.1.2-.5.6-.6.7-.1.1-.2.1-.4 0-.2-.1-.9-.3-1.7-1a6.3 6.3 0 0 1-1.2-1.5c-.1-.2 0-.3.1-.4l.3-.4c.1-.1.1-.2.2-.4v-.3l-.6-1.4c-.1-.4-.3-.3-.4-.3h-.4a.7.7 0 0 0-.5.2 2 2 0 0 0-.6 1.5c0 .9.6 1.7.7 1.9.1.1 1.3 2 3.1 2.8.4.2.8.3 1.1.4.5.1.9.1 1.2.1.4-.1 1.2-.5 1.4-1s.2-.9.1-1c-.1-.1-.2-.2-.4-.2Z" />
				</svg>
			</button>
		{/if}
		{#if enabledOptions.includes('copy')}
			<button
				type="button"
				class={btnClasses}
				onclick={copyLink}
				aria-label={copied ? 'Link copied' : 'Copy share link'}
				title={copied ? 'Copied!' : 'Copy link'}
			>
				<!-- Link chain / checkmark when copied -->
				{#if copied}
					<svg class="{iconClasses} share-icon" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<polyline points="20 6 9 17 4 12" />
					</svg>
				{:else}
					<svg class="{iconClasses} share-icon" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
						<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
					</svg>
				{/if}
			</button>
		{/if}
	</div>
{/if}
