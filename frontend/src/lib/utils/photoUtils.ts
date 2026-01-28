/**
 * Shared utility functions for photo-related operations
 * 
 * This module provides a single source of truth for photo title extraction,
 * eliminating code duplication across multiple components.
 */

import { MultiLangUtils } from '$utils/multiLang';
import { currentLanguage } from '$stores/language';

/**
 * Photo-like object with title and filename
 */
interface PhotoLike {
	title?: string | { en?: string; he?: string; [key: string]: any };
	filename: string;
}

/**
 * Get photo title from multi-language object
 * 
 * Handles both string and multi-language object formats.
 * Falls back to filename if no title is available.
 * Uses reactive language store for proper Svelte reactivity.
 * 
 * @param photo - Photo object with title and filename
 * @param useReactive - Whether to use reactive language store (default: true)
 * @returns Photo title string, or filename if no title found
 * 
 * @example
 * ```typescript
 * // Reactive (recommended for Svelte components)
 * const title = getPhotoTitle(photo);
 * 
 * // Non-reactive (for utilities)
 * const title = getPhotoTitle(photo, false);
 * ```
 */
export function getPhotoTitle(photo: PhotoLike, useReactive: boolean = true): string {
	if (photo.title) {
		if (typeof photo.title === 'string') {
			return photo.title;
		}
		
		if (useReactive) {
			// Use reactive language store - Svelte will track this dependency
			return MultiLangUtils.getTextValue(photo.title, $currentLanguage) || photo.filename;
		}
		
		// Fallback to simple extraction (non-reactive)
		return photo.title?.en || photo.title?.he || photo.filename;
	}
	
	return photo.filename;
}
