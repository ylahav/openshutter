import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';

// Theme store
const themeStore = writable<Theme>('system');

// Resolved theme (light or dark, never system)
const resolvedTheme = writable<'light' | 'dark'>('light');

// Initialize theme from localStorage or system preference
if (browser) {
	// Get stored theme or default to system
	const stored = (localStorage.getItem('theme') as Theme) || 'system';
	themeStore.set(stored);

	// Function to get system preference
	const getSystemTheme = (): 'light' | 'dark' => {
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	};

	// Function to apply theme to document
	const applyTheme = (theme: 'light' | 'dark') => {
		const root = document.documentElement;
		if (theme === 'dark') {
			root.classList.add('dark');
			root.classList.remove('light');
		} else {
			root.classList.add('light');
			root.classList.remove('dark');
		}
		resolvedTheme.set(theme);
	};

	// Function to resolve theme (system -> light/dark)
	const resolveTheme = (theme: Theme): 'light' | 'dark' => {
		if (theme === 'system') {
			return getSystemTheme();
		}
		return theme;
	};

	// Apply initial theme
	const initialResolved = resolveTheme(stored);
	applyTheme(initialResolved);

	// Subscribe to theme changes
	themeStore.subscribe((theme) => {
		const resolved = resolveTheme(theme);
		applyTheme(resolved);
		localStorage.setItem('theme', theme);
	});

	// Listen for system theme changes
	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
	const handleSystemThemeChange = () => {
		const currentTheme = get(themeStore);
		if (currentTheme === 'system') {
			const resolved = getSystemTheme();
			applyTheme(resolved);
		}
	};

	// Use addEventListener for better browser support
	if (mediaQuery.addEventListener) {
		mediaQuery.addEventListener('change', handleSystemThemeChange);
	} else {
		// Fallback for older browsers
		mediaQuery.addListener(handleSystemThemeChange);
	}
}

// Derived store for the resolved theme
export const theme = derived(themeStore, ($theme) => {
	if (!browser) return 'light';
	if ($theme === 'system') {
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}
	return $theme;
});

// Derived store for resolved theme (always light or dark)
export const resolved = resolvedTheme;
// Also export as resolvedTheme for compatibility
export { resolvedTheme };

// Function to set theme
export function setTheme(newTheme: Theme) {
	themeStore.set(newTheme);
}

// Function to toggle between light and dark
export function toggleTheme() {
	const current = get(themeStore);
	if (current === 'system') {
		// If system, toggle to opposite of current resolved theme
		const resolved = get(resolvedTheme);
		setTheme(resolved === 'light' ? 'dark' : 'light');
	} else {
		// Toggle between light and dark
		setTheme(current === 'light' ? 'dark' : 'light');
	}
}

// Export the store for direct access if needed
export { themeStore };
