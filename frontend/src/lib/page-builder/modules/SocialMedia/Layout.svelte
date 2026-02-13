<!-- frontend/src/lib/page-builder/modules/SocialMedia/Layout.svelte -->
<script lang="ts">
	import { siteConfigData } from '$stores/siteConfig';
	import IconRenderer from '$components/IconRenderer.svelte';

	export let config: any = {};
	export let data: any = null;
	export let templateConfig: Record<string, any> = {};

	// Get social media links from config (module props) or fall back to siteConfig
	$: socialMedia = config?.socialMedia || $siteConfigData?.contact?.socialMedia || {};
	$: iconSize = config?.iconSize || 'md';
	$: iconColor = config?.iconColor || 'current';
	$: showLabels = config?.showLabels ?? false;
	$: orientation = config?.orientation || 'horizontal'; // 'horizontal' | 'vertical'
	$: gap = config?.gap || 'normal'; // 'tight' | 'normal' | 'loose'
	$: className = config?.className || '';

	$: gapClass = gap === 'tight' ? 'gap-2' : gap === 'loose' ? 'gap-6' : 'gap-4';
	$: alignClass = config?.align === 'center' ? 'items-center' : config?.align === 'end' ? 'items-end' : 'items-start';
	$: justifyClass = config?.align === 'center' ? 'justify-center' : config?.align === 'end' ? 'justify-end' : 'justify-start';
	$: containerClass = orientation === 'vertical' 
		? `flex flex-col ${alignClass} ${gapClass}`
		: `flex items-center ${justifyClass} ${gapClass}`;

	const socialPlatforms = [
		{ key: 'facebook', label: 'Facebook', icon: 'Facebook' },
		{ key: 'instagram', label: 'Instagram', icon: 'Instagram' },
		{ key: 'twitter', label: 'Twitter', icon: 'Twitter' },
		{ key: 'linkedin', label: 'LinkedIn', icon: 'Linkedin' }
	];

	$: availablePlatforms = socialPlatforms.filter(platform => socialMedia[platform.key]);
	
	$: iconSizeClass = iconSize === 'sm' ? 'w-4 h-4' : iconSize === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
	// Handle icon color - if it's a hex/rgb/hsl, use inline style; otherwise use as-is (for Tailwind classes like 'text-gray-600')
	$: isCustomColor = iconColor && (iconColor.startsWith('#') || iconColor.includes('rgb') || iconColor.includes('hsl'));
	$: iconColorStyle = isCustomColor ? `color: ${iconColor};` : '';
	$: iconColorClass = isCustomColor ? '' : (iconColor === 'current' ? 'text-current' : iconColor);
</script>

{#if availablePlatforms.length > 0}
	<div class="{containerClass} {className}">
		{#each availablePlatforms as platform}
			<a
				href={socialMedia[platform.key]}
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center {gapClass} hover:opacity-75 transition-opacity"
				aria-label={platform.label}
			>
				<div class="{iconSizeClass} {iconColorClass}" style={iconColorStyle}>
					<IconRenderer icon={platform.icon} />
				</div>
				{#if showLabels}
					<span class="text-sm font-medium">{platform.label}</span>
				{/if}
			</a>
		{/each}
	</div>
{/if}
