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

	let baseBtnClasses = $derived(
		size === 'md'
			? 'inline-flex items-center justify-center px-3 py-1.5 rounded-md border border-gray-300 bg-white/90 hover:bg-white text-xs font-medium text-gray-700 shadow-sm'
			: 'inline-flex items-center justify-center px-2 py-1 rounded-md border border-gray-300 bg-white/90 hover:bg-white text-[11px] font-medium text-gray-700 shadow-sm'
	);
</script>

{#if resolvedUrl}
	<div class="flex flex-wrap items-center gap-2">
		{#if enabledOptions.includes('twitter')}
			<button
				type="button"
				class={baseBtnClasses}
				onclick={() =>
					openShareWindow(
						`https://twitter.com/intent/tweet?url=${encodedUrl}${encodedTitle ? `&text=${encodedTitle}` : ''}`
					)}
				aria-label="Share on X (Twitter)"
			>
				<span class="mr-1">X</span>
				<span class="hidden sm:inline">Share</span>
			</button>
		{/if}
		{#if enabledOptions.includes('facebook')}
			<button
				type="button"
				class={baseBtnClasses}
				onclick={() => openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
				aria-label="Share on Facebook"
			>
				<span class="mr-1">f</span>
				<span class="hidden sm:inline">Share</span>
			</button>
		{/if}
		{#if enabledOptions.includes('whatsapp')}
			<button
				type="button"
				class={baseBtnClasses}
				onclick={() =>
					openShareWindow(
						`https://api.whatsapp.com/send?text=${encodedTitle ? `${encodedTitle}%20-%20` : ''}${encodedUrl}`
					)}
				aria-label="Share on WhatsApp"
			>
				<span class="mr-1">WA</span>
				<span class="hidden sm:inline">Share</span>
			</button>
		{/if}
		{#if enabledOptions.includes('copy')}
			<button
				type="button"
				class={baseBtnClasses}
				onclick={copyLink}
				aria-label="Copy share link"
			>
				<span class="mr-1">🔗</span>
				<span class="hidden sm:inline">{copied ? 'Copied' : 'Copy link'}</span>
			</button>
		{/if}
	</div>
{/if}
