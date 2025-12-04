import { writable, derived, get } from 'svelte/store';
import type { LanguageCode } from '../types/multi-lang';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../types/multi-lang';

// Language store
export const currentLanguage = writable<LanguageCode>(DEFAULT_LANGUAGE);

// Derived store for RTL status
export const isRTL = derived(currentLanguage, ($lang) => {
	const langConfig = SUPPORTED_LANGUAGES.find((l) => l.code === $lang);
	return langConfig?.isRTL || false;
});

// Derived store for text direction
export const textDirection = derived(isRTL, ($isRTL) => ($isRTL ? 'rtl' : 'ltr'));

// Function to set language and update DOM
export function setLanguage(lang: LanguageCode) {
	currentLanguage.set(lang);
	
	// Update document direction
	if (typeof document !== 'undefined') {
		const direction = get(textDirection);
		document.documentElement.dir = direction;
		document.documentElement.lang = lang;
		
		// Add/remove RTL class
		if (get(isRTL)) {
			document.documentElement.classList.add('rtl');
		} else {
			document.documentElement.classList.remove('rtl');
		}
	}
}

// Initialize language from localStorage or default
if (typeof window !== 'undefined') {
	const stored = localStorage.getItem('language') as LanguageCode | null;
	if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) {
		setLanguage(stored);
	} else {
		setLanguage(DEFAULT_LANGUAGE);
	}
	
	// Subscribe to changes and save to localStorage
	currentLanguage.subscribe((lang) => {
		localStorage.setItem('language', lang);
	});
}
