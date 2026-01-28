/**
 * Helper utilities for MultiLangText conversion and normalization
 * 
 * Eliminates duplication of MultiLangText conversion patterns
 */

import type { MultiLangText } from '../types/multi-lang';

/**
 * Normalize a value to MultiLangText format
 * Handles string, object, null, and undefined inputs
 * 
 * @param value - String or MultiLangText object
 * @returns Normalized MultiLangText object
 * 
 * @example
 * ```typescript
 * normalizeMultiLangText('Hello') // { en: 'Hello', he: '' }
 * normalizeMultiLangText({ en: 'Hello', he: 'שלום' }) // { en: 'Hello', he: 'שלום' }
 * normalizeMultiLangText(null) // { en: '', he: '' }
 * ```
 */
export function normalizeMultiLangText(
	value: string | MultiLangText | null | undefined
): { en: string; he: string } {
	if (!value) {
		return { en: '', he: '' };
	}

	if (typeof value === 'string') {
		return { en: value, he: '' };
	}

	if (typeof value === 'object') {
		return {
			en: value.en || '',
			he: value.he || ''
		};
	}

	return { en: '', he: '' };
}

/**
 * Extract array from API response
 * Handles both { data: [...] } and direct array formats
 * 
 * @param result - API response object or array
 * @returns Extracted array or empty array
 * 
 * @example
 * ```typescript
 * extractArrayResponse({ data: [1, 2, 3] }) // [1, 2, 3]
 * extractArrayResponse([1, 2, 3]) // [1, 2, 3]
 * extractArrayResponse({ error: 'Not found' }) // []
 * ```
 */
export function extractArrayResponse<T = any>(result: any): T[] {
	if (Array.isArray(result)) {
		return result;
	}

	if (result && Array.isArray(result.data)) {
		return result.data;
	}

	if (result && typeof result === 'object') {
		// Check if it's an error object
		if (result.error || result.success === false) {
			return [];
		}
	}

	return [];
}
