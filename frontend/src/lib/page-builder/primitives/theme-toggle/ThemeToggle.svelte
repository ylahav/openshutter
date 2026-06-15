<script lang="ts">
	import { toggleTheme, resolvedTheme } from '$lib/stores/theme';

	/** `icons` — sun/moon only; `text` — Light / Dark; `both` — icon + label. */
	let { variant = 'icons' }: { variant?: 'icons' | 'text' | 'both' } = $props();

	const currentTheme = $derived($resolvedTheme === 'dark' ? 'dark' : 'light');
	const nextTheme = $derived(currentTheme === 'dark' ? 'light' : 'dark');
	const ariaLabel = $derived(`Switch to ${nextTheme} theme`);
	const textLabel = $derived(nextTheme);
	const variantClass = $derived(
		variant === 'text' ? 'pb-themeToggle--text' : variant === 'both' ? 'pb-themeToggle--both' : 'pb-themeToggle--icons'
	);
</script>

<button
	onclick={toggleTheme}
	class={`pb-themeToggle ${variantClass}`}
	type="button"
	title={ariaLabel}
	aria-label={ariaLabel}
>
	{#if variant === 'text'}
		{textLabel}
	{:else if variant === 'both'}
		<span class="pb-themeToggle__both">
			{#if currentTheme === 'dark'}
				<svg class="pb-themeToggle__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
				</svg>
			{:else}
				<svg class="pb-themeToggle__icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
				</svg>
			{/if}
			<span class="pb-themeToggle__label">{textLabel}</span>
		</span>
	{:else if currentTheme === 'dark'}
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
