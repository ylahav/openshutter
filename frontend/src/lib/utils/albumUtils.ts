/**
 * Shared utility functions for album-related operations
 * 
 * This module provides a single source of truth for album name and description
 * extraction, eliminating code duplication across multiple components.
 */

import { MultiLangUtils } from '$utils/multiLang';
import { currentLanguage } from '$stores/language';

/**
 * Album-like object with name property
 */
interface AlbumLike {
	name?: string | { en?: string; he?: string; [key: string]: any };
}

/**
 * Album-like object with description property
 */
interface AlbumWithDescription extends AlbumLike {
	description?: string | { en?: string; he?: string; [key: string]: any };
}

/**
 * Get album name from multi-language object
 * 
 * Handles both string and multi-language object formats.
 * Uses reactive language store for proper Svelte reactivity.
 * 
 * @param album - Album object (can be null)
 * @param useReactive - Whether to use reactive language store (default: true)
 * @returns Album name string, or '(No name)' if not found
 * 
 * @example
 * ```typescript
 * // Reactive (recommended for Svelte components)
 * const name = getAlbumName(album);
 * 
 * // Non-reactive (for utilities or when language doesn't change)
 * const name = getAlbumName(album, false);
 * ```
 */
export function getAlbumName(album: AlbumLike | null, useReactive: boolean = true): string {
	if (!album) return '';
	
	if (typeof album.name === 'string') {
		return album.name;
	}
	
	if (useReactive) {
		// Use reactive language store - Svelte will track this dependency
		return MultiLangUtils.getTextValue(album.name, $currentLanguage) || '(No name)';
	}
	
	// Fallback to simple extraction (non-reactive)
	return album.name?.en || album.name?.he || '(No name)';
}

/**
 * Get album description from multi-language HTML object
 * 
 * Handles both string and multi-language object formats.
 * Uses reactive language store for proper Svelte reactivity.
 * 
 * @param album - Album object with description (can be null)
 * @param useReactive - Whether to use reactive language store (default: true)
 * @returns Album description HTML string, or empty string if not found
 * 
 * @example
 * ```typescript
 * // Reactive (recommended for Svelte components)
 * const description = getAlbumDescription(album);
 * 
 * // Non-reactive (for utilities)
 * const description = getAlbumDescription(album, false);
 * ```
 */
export function getAlbumDescription(album: AlbumWithDescription | null, useReactive: boolean = true): string {
	if (!album || !album.description) {
		return '';
	}
	
	if (typeof album.description === 'string') {
		return album.description;
	}
	
	if (useReactive) {
		// Use reactive language store - Svelte will track this dependency
		return MultiLangUtils.getHTMLValue(album.description, $currentLanguage) || '';
	}
	
	// Fallback to simple extraction (non-reactive)
	return album.description?.en || album.description?.he || '';
}
