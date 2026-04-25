<script lang="ts">
	import { publicSiteLogo, siteConfigData } from '$stores/siteConfig';
	import { currentLanguage } from '$stores/language';
	import { getProductName } from '$lib/utils/productName';

	export let config: any = {};

	$: logo = $publicSiteLogo;
	$: title = getProductName($siteConfigData ?? null, $currentLanguage);
	$: size = config?.size ?? 'md';
	$: showFallback = config?.fallbackIcon !== false;
	$: linkToHome = config?.linkToHome !== false;

	$: sizeClass =
		size === 'sm'
			? 'pb-logo__media--sm'
			: size === 'lg'
				? 'pb-logo__media--lg'
				: 'pb-logo__media--md';
</script>

<div class="pb-logo">
	{#if linkToHome}
		<a href="/" aria-label={title} class="pb-logo__link">
			{#if logo}
				<img src={logo} alt={title} class="pb-logo__media {sizeClass}" />
			{:else if showFallback}
				<div class="pb-logo__fallback {sizeClass}" style="background: var(--os-primary, #3B82F6);">
					<svg class="pb-logo__fallbackIcon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
					</svg>
				</div>
			{/if}
		</a>
	{:else}
		{#if logo}
			<img src={logo} alt={title} class="pb-logo__media {sizeClass}" />
		{:else if showFallback}
			<div class="pb-logo__fallback {sizeClass}" style="background: var(--os-primary, #3B82F6);">
				<svg class="pb-logo__fallbackIcon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
				</svg>
			</div>
		{/if}
	{/if}
</div>

<style lang="scss">
	.pb-logo {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	.pb-logo__link {
		display: inline-flex;
		align-items: center;
	}

	.pb-logo__media {
		object-fit: contain;
	}

	.pb-logo__media--sm {
		width: 2rem;
		height: 2rem;
	}

	.pb-logo__media--md {
		width: 2.5rem;
		height: 2.5rem;
	}

	.pb-logo__media--lg {
		width: 3.5rem;
		height: 3.5rem;
	}

	.pb-logo__fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.5rem;
		box-shadow: 0 10px 20px rgba(0, 0, 0, 0.16);
	}

	.pb-logo__fallbackIcon {
		width: 50%;
		height: 50%;
		color: #fff;
	}
</style>
