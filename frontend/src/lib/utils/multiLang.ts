import { get } from 'svelte/store';
import { currentLanguage } from '../stores/language';
import type { MultiLangText, MultiLangHTML } from '../types/multi-lang';
import { SUPPORTED_LANGUAGES } from '../types/multi-lang';

/**
 * Get text value from multilingual object
 */
export function getTextValue(
	text: string | MultiLangText | undefined | null,
	lang?: string
): string {
	if (!text) return '';

	if (typeof text === 'string') return text;

	const language = lang || get(currentLanguage);
	return text[language] || text['en'] || Object.values(text)[0] || '';
}

/**
 * Get HTML value from multilingual object
 */
export function getHTMLValue(
	html: string | MultiLangHTML | undefined | null,
	lang?: string
): string {
	if (!html) return '';

	if (typeof html === 'string') return html;

	const language = lang || get(currentLanguage);
	return html[language] || html['en'] || Object.values(html)[0] || '';
}

/**
 * Get value for a specific language, fallback to first available
 */
export function getValue(field: MultiLangText | MultiLangHTML, languageCode: string): string {
	if (!field) return '';

	// Ensure field is an object
	if (typeof field !== 'object') {
		return '';
	}

	// Try to get value for requested language
	if (field[languageCode]) {
		const value = field[languageCode];
		return typeof value === 'string' ? value : '';
	}

	// Fallback to first available language
	const firstLanguage = Object.keys(field)[0];
	if (firstLanguage) {
		const value = field[firstLanguage];
		return typeof value === 'string' ? value : '';
	}

	return '';
}

/**
 * Set value for a specific language
 */
export function setValue(
	field: MultiLangText | MultiLangHTML,
	languageCode: string,
	value: string
): MultiLangText | MultiLangHTML {
	// Filter out non-language keys (like numeric indices) and only keep valid language codes
	const validLanguages = SUPPORTED_LANGUAGES.map((lang) => lang.code);
	const filteredField = Object.keys(field || {}).reduce((acc, key) => {
		if (validLanguages.includes(key)) {
			acc[key] = field[key];
		}
		return acc;
	}, {} as MultiLangText | MultiLangHTML);

	return {
		...filteredField,
		[languageCode]: value
	};
}

/**
 * Check if field has content for a language
 */
export function hasContent(field: MultiLangText | MultiLangHTML, languageCode: string): boolean {
	return !!(field && field[languageCode] && field[languageCode].trim());
}

/**
 * Get all languages that have content
 */
export function getLanguagesWithContent(field: MultiLangText | MultiLangHTML): string[] {
	if (!field) return [];

	const validLanguages = SUPPORTED_LANGUAGES.map((lang) => lang.code);
	return Object.keys(field).filter(
		(lang) => validLanguages.includes(lang) && field[lang] && field[lang].trim()
	);
}

/**
 * Clean field by removing invalid keys (non-language keys)
 */
export function clean(field: MultiLangText | MultiLangHTML): MultiLangText | MultiLangHTML {
	if (!field) return {};

	const validLanguages = SUPPORTED_LANGUAGES.map((lang) => lang.code);
	return Object.keys(field).reduce((acc, key) => {
		if (validLanguages.includes(key)) {
			acc[key] = field[key];
		}
		return acc;
	}, {} as MultiLangText | MultiLangHTML);
}

/**
 * MultiLangUtils - utility class for multilingual operations
 */
export const MultiLangUtils = {
	getTextValue,
	getHTMLValue,
	getValue,
	setValue,
	hasContent,
	getLanguagesWithContent,
	clean
};
