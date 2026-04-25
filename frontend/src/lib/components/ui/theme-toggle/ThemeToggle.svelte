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
	class={`pb-themeToggle ${variant === 'text' ? 'pb-themeToggle--text' : 'pb-themeToggle--icons'}`}
	type="button"
	title={ariaLabel}
	aria-label={ariaLabel}
>
	{#if variant === 'text'}
		{textLabel}
	{:else if nextIsLight}
		<!-- Sun icon → switch to light -->
		<svg class="pb-themeToggle__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
		</svg>
	{:else}
		<!-- Moon icon → switch to dark -->
		<svg class="pb-themeToggle__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
		</svg>
	{/if}
</button>

<style lang="scss">
	.pb-themeToggle {
		border: 0;
		border-radius: 0.375rem;
		background: transparent;
		color: inherit;
		transition: background-color 0.2s ease;
	}

	.pb-themeToggle:hover {
		background: rgb(0 0 0 / 0.1);
	}

	:global(html.dark) .pb-themeToggle:hover {
		background: rgb(255 255 255 / 0.1);
	}

	.pb-themeToggle--icons {
		padding: 0.5rem;
	}

	.pb-themeToggle--text {
		padding: 0.375rem 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.pb-themeToggle__icon {
		width: 1.25rem;
		height: 1.25rem;
		color: currentColor;
	}
</style>
