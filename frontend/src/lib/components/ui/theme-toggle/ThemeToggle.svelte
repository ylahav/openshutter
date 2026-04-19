<script lang="ts">
	import { toggleTheme, resolvedTheme } from '$lib/stores/theme';

	/** `icons` — sun/moon SVGs; `text` — short labels (e.g. Light / Dark). */
	export let variant: 'icons' | 'text' = 'icons';

	$: nextIsLight = $resolvedTheme === 'dark';
	$: ariaLabel = nextIsLight ? 'Switch to light theme' : 'Switch to dark theme';
	$: textLabel = nextIsLight ? 'Light' : 'Dark';
</script>

<button
	on:click={toggleTheme}
	class={variant === 'text'
		? 'px-3 py-1.5 text-sm font-medium rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors whitespace-nowrap'
		: 'p-2 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors'}
	type="button"
	title={ariaLabel}
	aria-label={ariaLabel}
>
	{#if variant === 'text'}
		{textLabel}
	{:else if nextIsLight}
		<!-- Sun icon → switch to light -->
		<svg class="w-5 h-5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
		</svg>
	{:else}
		<!-- Moon icon → switch to dark -->
		<svg class="w-5 h-5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
		</svg>
	{/if}
</button>
