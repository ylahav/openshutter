<script lang="ts">
	import { onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { themeStore, resolvedTheme } from '$lib/stores/theme';
	import { browser } from '$app/environment';

	export let defaultTheme: 'light' | 'dark' | 'system' = 'system';
	export let enableSystem = true;
	export let disableTransitionOnChange = false;

	let mounted = false;

	onMount(() => {
		mounted = true;

		// Initialize theme from localStorage or default
		if (browser) {
			const stored = (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || defaultTheme;
			themeStore.set(stored);

			// Apply theme immediately
			const root = document.documentElement;
			const currentTheme = get(themeStore);
			const resolved = currentTheme === 'system' 
				? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
				: (currentTheme as 'light' | 'dark');

			if (resolved === 'dark') {
				root.classList.add('dark');
				root.classList.remove('light');
			} else {
				root.classList.add('light');
				root.classList.remove('dark');
			}

			// Subscribe to theme changes
			const unsubscribe = themeStore.subscribe((theme) => {
				const resolved = theme === 'system'
					? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
					: (theme as 'light' | 'dark');

				if (disableTransitionOnChange) {
					const css = document.createElement('style');
					css.appendChild(document.createTextNode('*, *::before, *::after { transition: none !important; }'));
					document.head.appendChild(css);

					if (resolved === 'dark') {
						root.classList.add('dark');
						root.classList.remove('light');
					} else {
						root.classList.add('light');
						root.classList.remove('dark');
					}

					setTimeout(() => {
						document.head.removeChild(css);
					}, 0);
				} else {
					if (resolved === 'dark') {
						root.classList.add('dark');
						root.classList.remove('light');
					} else {
						root.classList.add('light');
						root.classList.remove('dark');
					}
				}

				resolvedTheme.set(resolved);
			});

			// Listen for system theme changes
			const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
			const handleSystemThemeChange = () => {
				const currentTheme = get(themeStore);
				if (currentTheme === 'system') {
					const resolved = mediaQuery.matches ? 'dark' : 'light';
					if (resolved === 'dark') {
						root.classList.add('dark');
						root.classList.remove('light');
					} else {
						root.classList.add('light');
						root.classList.remove('dark');
					}
					resolvedTheme.set(resolved);
				}
			};

			if (mediaQuery.addEventListener) {
				mediaQuery.addEventListener('change', handleSystemThemeChange);
			} else {
				mediaQuery.addListener(handleSystemThemeChange);
			}

			return () => {
				unsubscribe();
				if (mediaQuery.removeEventListener) {
					mediaQuery.removeEventListener('change', handleSystemThemeChange);
				} else {
					mediaQuery.removeListener(handleSystemThemeChange);
				}
			};
		}
	});
</script>

{#if mounted}
	<slot />
{:else}
	<!-- Suppress hydration warning during SSR -->
	<div style="display: contents;">
		<slot />
	</div>
{/if}
