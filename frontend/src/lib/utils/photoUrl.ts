/**
 * Shared utility functions for constructing photo URLs
 * 
 * This module provides a single source of truth for photo URL construction,
 * eliminating code duplication across multiple components.
 */

/**
 * Photo storage structure (flexible to handle different API response formats)
 */
interface PhotoStorage {
	provider?: string;
	url?: string;
	path?: string;
	thumbnailPath?: string;
	thumbnails?: Record<string, string>;
}

/**
 * Photo-like object with storage information
 */
interface PhotoLike {
	_id?: string;
	url?: string;
	storage?: PhotoStorage;
}

/**
 * Options for getPhotoUrl function
 */
export interface PhotoUrlOptions {
	/** Whether to prefer thumbnail URLs (default: true) */
	preferThumbnail?: boolean;
	/** Fallback URL if no photo URL is found (default: '/placeholder.jpg') */
	fallback?: string;
}

/**
 * Helper function to construct storage URLs
 * Handles both full URLs and relative paths
 */
function constructStorageUrl(path: string, provider: string = 'local'): string {
	// If already a full URL, return as-is
	if (path.startsWith('/api/storage/serve/') || path.startsWith('http')) {
		return path;
	}

	// Remove leading slash if present
	const cleanPath = path.startsWith('/') ? path.slice(1) : path;
	return `/api/storage/serve/${provider}/${encodeURIComponent(cleanPath)}`;
}

/**
 * Get photo URL (preferring thumbnail if available)
 * 
 * Priority order:
 * 1. thumbnails object (medium > small > any)
 * 2. thumbnailPath
 * 3. url
 * 4. path
 * 5. photo.url (legacy)
 * 6. fallback
 * 
 * @param photo - Photo object with storage information
 * @param options - Configuration options
 * @returns Photo URL string
 */
export function getPhotoUrl(photo: PhotoLike, options: PhotoUrlOptions = {}): string {
	const { preferThumbnail = true, fallback = '/placeholder.jpg' } = options;

	if (!photo.storage) {
		return photo.url || fallback;
	}

	const provider = photo.storage.provider || 'local';

	// Helper to check if a path is a thumbnail path
	const isThumbnailPath = (path: string): boolean => {
		return path.includes('/medium/') || path.includes('/small/') || path.includes('/thumb/');
	};

	// Helper to get full image path (non-thumbnail)
	const getFullImagePath = (): string | null => {
		// Check url first
		if (photo.storage!.url) {
			const urlPath = photo.storage!.url;
			// If url is not a thumbnail path, use it
			if (!isThumbnailPath(urlPath)) {
				return constructStorageUrl(urlPath, provider);
			}
		}
		// Check path
		if (photo.storage!.path) {
			const pathValue = photo.storage!.path;
			// If path is not a thumbnail path, use it
			if (!isThumbnailPath(pathValue)) {
				return constructStorageUrl(pathValue, provider);
			}
		}
		return null;
	};

	// Check thumbnails object first (if preferThumbnail is true)
	if (preferThumbnail && photo.storage.thumbnails && typeof photo.storage.thumbnails === 'object') {
		const thumbnails = photo.storage.thumbnails as Record<string, string>;
		// Prefer medium, then small, then any available
		const thumbnailUrl = thumbnails.medium || thumbnails.small || Object.values(thumbnails)[0];
		if (thumbnailUrl) {
			// Check if we have a full image available
			const fullImagePath = getFullImagePath();
			// If thumbnail path looks like it might not exist and we have full image, use full image
			if (fullImagePath && isThumbnailPath(thumbnailUrl)) {
				// For Google Drive, thumbnails might not exist, so use full image directly
				return fullImagePath;
			}
			return constructStorageUrl(thumbnailUrl, provider);
		}
	}

	// Check thumbnailPath (if preferThumbnail is true)
	if (preferThumbnail && photo.storage.thumbnailPath) {
		const fullImagePath = getFullImagePath();
		
		// If thumbnailPath looks like a thumbnail AND we have a full image, use full image directly
		// This prevents 404s for Google Drive where thumbnails might not exist
		if (fullImagePath && isThumbnailPath(photo.storage.thumbnailPath)) {
			return fullImagePath;
		}
		
		// Otherwise use thumbnailPath
		return constructStorageUrl(photo.storage.thumbnailPath, provider);
	}

	// Fallback to url (checking if it's not a thumbnail)
	if (photo.storage.url) {
		const urlPath = photo.storage.url;
		if (!isThumbnailPath(urlPath)) {
			return constructStorageUrl(urlPath, provider);
		}
	}

	// Fallback to path (checking if it's not a thumbnail)
	if (photo.storage.path) {
		const pathValue = photo.storage.path;
		if (!isThumbnailPath(pathValue)) {
			return constructStorageUrl(pathValue, provider);
		}
	}

	// Final fallback - use thumbnailPath even if it's a thumbnail (better than nothing)
	if (photo.storage.thumbnailPath) {
		return constructStorageUrl(photo.storage.thumbnailPath, provider);
	}

	// Final fallback
	return photo.url || fallback;
}

/**
 * Get full-size photo URL (preferring full image over thumbnail)
 * 
 * Priority order:
 * 1. url (if not a thumbnail path)
 * 2. path (if not a thumbnail path)
 * 3. thumbnailPath (as fallback)
 * 4. thumbnails (as fallback)
 * 5. photo.url (legacy)
 * 6. fallback
 * 
 * @param photo - Photo object with storage information
 * @param fallback - Fallback URL if no photo URL is found (default: '/placeholder.jpg')
 * @returns Full-size photo URL string
 */
export function getPhotoFullUrl(photo: PhotoLike, fallback: string = '/placeholder.jpg'): string {
	if (!photo.storage) {
		return photo.url || fallback;
	}

	const provider = photo.storage.provider || 'local';

	// For full image, prefer url or path over thumbnailPath
	if (photo.storage.url) {
		const url = constructStorageUrl(photo.storage.url, provider);
		// Skip thumbnail paths
		if (!url.includes('/medium/') && !url.includes('/small/') && !url.includes('/thumb/')) {
			return url;
		}
	}

	// Try path if available
	if (photo.storage.path) {
		const path = constructStorageUrl(photo.storage.path, provider);
		// Skip thumbnail paths
		if (!path.includes('/medium/') && !path.includes('/small/') && !path.includes('/thumb/')) {
			return path;
		}
	}

	// Fallback to thumbnailPath if no url/path available
	return getPhotoUrl(photo, { preferThumbnail: true, fallback });
}
