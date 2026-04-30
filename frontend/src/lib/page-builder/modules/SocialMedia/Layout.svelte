<!-- frontend/src/lib/page-builder/modules/SocialMedia/Layout.svelte -->
<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import IconRenderer from '$components/IconRenderer.svelte';
	import { parseLinksJson, normalizeLinksArray, linksFromSocialObject } from './resolveLinks';

	export let config: any = {};

	$: iconSize = config?.iconSize || 'md';
	$: iconColor = config?.iconColor || 'current';
	$: showLabels = config?.showLabels ?? false;
	$: linkDisplay = config?.linkDisplay === 'text' ? 'text' : 'icon';
	$: orientation = config?.orientation || 'horizontal';
	$: gap = config?.gap || 'normal';
	$: align = config?.align === 'center' ? 'center' : config?.align === 'end' ? 'end' : 'start';
	$: className = config?.className || '';

	$: fromJson = normalizeLinksArray(config?.links) ?? parseLinksJson(config?.linksJson);
	$: legacyOverride =
		config?.socialMedia && typeof config.socialMedia === 'object' && !Array.isArray(config.socialMedia)
			? (config.socialMedia as Record<string, unknown>)
			: null;
	$: siteSocial = $siteConfigData?.contact?.socialMedia;

	$: resolvedLinks = (() => {
		if (fromJson?.length) return fromJson;
		if (
			legacyOverride &&
			Object.keys(legacyOverride).some((k) => {
				const v = legacyOverride[k];
				return typeof v === 'string' && v.trim().length > 0;
			})
		) {
			return linksFromSocialObject({ ...(siteSocial || {}), ...legacyOverride });
		}
		return linksFromSocialObject(siteSocial ?? {});
	})();

	$: rootClass = [
		'pb-socialMedia',
		orientation === 'vertical' ? 'pb-socialMedia--vertical' : 'pb-socialMedia--horizontal',
		gap === 'tight' ? 'pb-socialMedia--gapTight' : gap === 'loose' ? 'pb-socialMedia--gapLoose' : 'pb-socialMedia--gapNormal',
		align === 'center' ? 'pb-socialMedia--alignCenter' : align === 'end' ? 'pb-socialMedia--alignEnd' : 'pb-socialMedia--alignStart',
		className
	]
		.filter(Boolean)
		.join(' ');

	$: iconSizeMod =
		iconSize === 'sm' ? 'pb-socialMedia__icon--sm' : iconSize === 'lg' ? 'pb-socialMedia__icon--lg' : 'pb-socialMedia__icon--md';

	$: isCustomColor =
		iconColor && (iconColor.startsWith('#') || iconColor.includes('rgb') || iconColor.includes('hsl'));
	$: iconColorStyle = isCustomColor ? `color: ${iconColor};` : '';
	$: iconToneClass = (() => {
		if (isCustomColor) return '';
		if (iconColor === 'current') return 'pb-socialMedia__iconTone--current';
		if (typeof iconColor === 'string' && (/^text-/.test(iconColor) || iconColor.includes('['))) {
			return iconColor;
		}
		return 'pb-socialMedia__iconTone--fg';
	})();
</script>

{#if resolvedLinks.length > 0}
	<div class={rootClass} data-social-link-display={linkDisplay}>
		{#each resolvedLinks as link, i (`${i}-${link.url}`)}
			<a
				href={link.url}
				target="_blank"
				rel="noopener noreferrer"
				class="pb-socialMedia__link"
				aria-label={link.label}
				data-link-display={linkDisplay}
			>
				{#if linkDisplay === 'text'}
					<span class="pb-socialMedia__textOnly">{link.label}</span>
				{:else}
					<div class="pb-socialMedia__icon {iconSizeMod} {iconToneClass}" style={iconColorStyle}>
						<IconRenderer icon={link.icon} />
					</div>
					{#if showLabels}
						<span class="pb-socialMedia__label">{link.label}</span>
					{/if}
				{/if}
			</a>
		{/each}
	</div>
{/if}

<style lang="scss">
	.pb-socialMedia {
		--pb-sm-link-gap: 1rem;
		display: flex;
		flex-wrap: wrap;
	}
	.pb-socialMedia--gapTight {
		--pb-sm-link-gap: 0.5rem;
		gap: 0.5rem;
	}
	.pb-socialMedia--gapNormal {
		--pb-sm-link-gap: 1rem;
		gap: 1rem;
	}
	.pb-socialMedia--gapLoose {
		--pb-sm-link-gap: 1.5rem;
		gap: 1.5rem;
	}

	.pb-socialMedia--horizontal {
		flex-direction: row;
		align-items: center;
	}
	.pb-socialMedia--horizontal.pb-socialMedia--alignStart {
		justify-content: flex-start;
	}
	.pb-socialMedia--horizontal.pb-socialMedia--alignCenter {
		justify-content: center;
	}
	.pb-socialMedia--horizontal.pb-socialMedia--alignEnd {
		justify-content: flex-end;
	}

	.pb-socialMedia--vertical {
		flex-direction: column;
	}
	.pb-socialMedia--vertical.pb-socialMedia--alignStart {
		align-items: flex-start;
	}
	.pb-socialMedia--vertical.pb-socialMedia--alignCenter {
		align-items: center;
	}
	.pb-socialMedia--vertical.pb-socialMedia--alignEnd {
		align-items: flex-end;
	}

	.pb-socialMedia__link {
		display: inline-flex;
		align-items: center;
		gap: var(--pb-sm-link-gap);
		text-decoration: none;
		color: inherit;
		transition: opacity 0.15s ease;
	}
	.pb-socialMedia__link:hover {
		opacity: 0.75;
	}

	.pb-socialMedia__textOnly {
		font-size: 0.875rem;
		font-weight: 500;
		color: currentColor;
	}

	.pb-socialMedia__icon {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: center;
	}
	.pb-socialMedia__icon :global(svg) {
		width: 100%;
		height: 100%;
	}
	.pb-socialMedia__icon--sm {
		width: 1rem;
		height: 1rem;
	}
	.pb-socialMedia__icon--md {
		width: 1.5rem;
		height: 1.5rem;
	}
	.pb-socialMedia__icon--lg {
		width: 2rem;
		height: 2rem;
	}

	.pb-socialMedia__iconTone--current {
		color: currentColor;
	}
	.pb-socialMedia__iconTone--fg {
		color: var(--tp-fg);
	}

	.pb-socialMedia__label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--tp-fg-muted);
	}
</style>
