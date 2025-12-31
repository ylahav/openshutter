import { writable, derived, get } from 'svelte/store';
import { currentLanguage } from './language';
import type { LanguageCode } from '../types/multi-lang';
import enTranslations from '../../i18n/en.json';
import heTranslations from '../../i18n/he.json';

type TranslationDictionary = Record<string, any>;

const translations: Record<string, TranslationDictionary> = {
	en: enTranslations,
	he: heTranslations,
};

function getNestedValue(obj: any, path: string): string | undefined {
	const parts = path.split('.');
	let current: any = obj;
	
	for (const part of parts) {
		if (current && typeof current === 'object' && part in current) {
			current = current[part];
		} else {
			return undefined;
		}
	}
	
	return typeof current === 'string' ? current : undefined;
}

function createI18nStore() {
	const { subscribe } = writable({});

	return {
		subscribe,
		/**
		 * Get a translation string by key path (e.g., 'navigation.home')
		 * Falls back to English if translation is missing, then to the key itself
		 */
		t: (key: string, fallback?: string): string => {
			const lang = get(currentLanguage);
			const dict = translations[lang] || translations.en;
			
			// Try current language first
			const value = getNestedValue(dict, key);
			if (value) return value;
			
			// Fallback to English
			const enValue = getNestedValue(translations.en, key);
			if (enValue) return enValue;
			
			// Fallback to provided fallback or key itself
			return fallback || key;
		},
	};
}

export const i18n = createI18nStore();

// Derived store that provides the translation function with current language
export const t = derived(currentLanguage, ($lang) => {
	const dict = translations[$lang] || translations.en;
	
	return (key: string, fallback?: string): string => {
		// Try current language first
		const value = getNestedValue(dict, key);
		if (value) return value;
		
		// Fallback to English
		const enValue = getNestedValue(translations.en, key);
		if (enValue) return enValue;
		
		// Fallback to provided fallback or key itself
		return fallback || key;
	};
});
