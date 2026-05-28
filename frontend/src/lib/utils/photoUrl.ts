/**
 * Shared utility functions for constructing photo URLs
 * 
 * This module provides a single source of truth for photo URL construction,
 * eliminating code duplication across multiple components.
 */

/** Bump this to bust caches after backend image pipeline changes (e.g. EXIF orientation fix). */
const STORAGE_URL_VERSION = 4;

/**
 * Photo storage structure (flexible to handle different API response formats)
 */
interface PhotoStorage {
	provider?: string;
	url?: string;
	path?: string;
	thumbnailPath?: string;
	thumbnails?: Record<string, string>;
	/** When set, appended to `/api/storage/serve/...` URLs so dedicated owner storage resolves on the backend. */
	storageOwnerId?: string;
}

/**
 * Photo-like object with storage information
 */
interface PhotoLike {
	_id?: string;
	url?: string;
	storage?: PhotoStorage;
	/** Display-only rotation: 90, -90, or 180. Applied via CSS transform. */
	rotation?: number;
}

/**
 * Get inline style for display-only photo rotation (thumbnails and full-size).
 * Returns e.g. "transform: rotate(90deg)" or "" when no rotation.
 */
export function getPhotoRotationStyle(photo: { rotation?: number } | null | undefined): string {
	if (photo?.rotation === 90 || photo?.rotation === -90 || photo?.rotation === 180) {
		return `transform: rotate(${photo.rotation}deg);`;
	}
	return '';
}

/**
 * Options for getPhotoUrl function
 */
export interface PhotoUrlOptions {
	/** Whether to prefer thumbnail URLs (default: true) */
	preferThumbnail?: boolean;
	/** Thumbnail tier for grids: `small` saves bandwidth on mobile (default: `medium`). */
	thumbnailSize?: 'small' | 'medium';
	/** Fallback URL if no photo URL is found (default: '/placeholder.jpg') */
	fallback?: string;
}

function pickThumbnailFromRecord(
	thumbnails: Record<string, string>,
	size: 'small' | 'medium'
): string | undefined {
	if (size === 'small') {
		return thumbnails.small || thumbnails.medium || Object.values(thumbnails)[0];
	}
	return thumbnails.medium || thumbnails.small || Object.values(thumbnails)[0];
}

/** Prefer smallest thumbnail tier — use for album grids, not lightbox. */
export function getPhotoGridUrl(photo: PhotoLike, fallback: string = ''): string {
	return getPhotoUrl(photo, { preferThumbnail: true, thumbnailSize: 'small', fallback });
}

/**
 * Helper function to construct storage URLs
 * Handles both full URLs and relative paths.
 * Appends ?v=N so deployed clients bypass old cached (e.g. wrong-orientation) responses.
 * Appends storageOwnerId for same-origin `/api/storage/serve/...` URLs (dedicated owner storage).
 */
function constructStorageUrl(path: string, provider: string = 'local', storageOwnerId?: string): string {
	const param = `v=${STORAGE_URL_VERSION}`;
	const owner =
		storageOwnerId != null && String(storageOwnerId).trim() !== ''
			? String(storageOwnerId).trim()
			: '';

	const appendOwner = (url: string): string => {
		if (!owner) return url;
		const sep = url.includes('?') ? '&' : '?';
		return `${url}${sep}storageOwnerId=${encodeURIComponent(owner)}`;
	};

	const normalizePath = (raw: string, prov: string): string => {
		let value = String(raw || '').trim();
		if (!value) return '';
		try {
			value = decodeURIComponent(value);
		} catch {
			// Keep raw value when it is not URI-encoded.
		}
		if (prov === 'local') {
			// Local provider stores relative paths; leading slash resolves incorrectly in serve route.
			value = value.replace(/^\/+/, '');
		}
		return value;
	};

	if (path.startsWith('/api/storage/serve/') || path.startsWith('http')) {
		if (path.startsWith('/api/storage/serve/')) {
			const [rawPath, rawQuery = ''] = path.split('?');
			const parts = rawPath.split('/');
			// /api/storage/serve/{provider}/{encodedPath}
			if (parts.length >= 6) {
				const prov = parts[4] || provider || 'local';
				const encodedRest = parts.slice(5).join('/');
				const normalizedRest = normalizePath(encodedRest, prov);
				const rebuiltPath = `/api/storage/serve/${prov}/${encodeURIComponent(normalizedRest)}`;
				const existingParams = new URLSearchParams(rawQuery);
				existingParams.set('v', String(STORAGE_URL_VERSION));
				const withQuery = `${rebuiltPath}?${existingParams.toString()}`;
				return appendOwner(withQuery);
			}
		}
		const sep = path.includes('?') ? '&' : '?';
		const withV = `${path}${sep}${param}`;
		return path.startsWith('/api/storage/serve/') ? appendOwner(withV) : withV;
	}

	const cleanPath = normalizePath(path, provider);
	if (!cleanPath.trim()) {
		return '';
	}
	const base = `/api/storage/serve/${provider}/${encodeURIComponent(cleanPath)}?${param}`;
	return appendOwner(base);
}

function resolveStorageOwnerId(storage: PhotoStorage | undefined): string | undefined {
	if (!storage?.storageOwnerId) return undefined;
	const s = String(storage.storageOwnerId).trim();
	return s || undefined;
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
	const { preferThumbnail = true, thumbnailSize = 'medium', fallback = '/placeholder.jpg' } = options;

	if (!photo.storage) {
		return photo.url || fallback;
	}

	const provider = photo.storage.provider || 'local';
	const storageOwnerId = resolveStorageOwnerId(photo.storage);

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
				return constructStorageUrl(urlPath, provider, storageOwnerId);
			}
		}
		// Check path
		if (photo.storage!.path) {
			const pathValue = photo.storage!.path;
			// If path is not a thumbnail path, use it
			if (!isThumbnailPath(pathValue)) {
				return constructStorageUrl(pathValue, provider, storageOwnerId);
			}
		}
		return null;
	};

	// Check thumbnails object first (if preferThumbnail is true)
	if (preferThumbnail && photo.storage.thumbnails && typeof photo.storage.thumbnails === 'object') {
		const thumbnails = photo.storage.thumbnails as Record<string, string>;
		const thumbnailUrl = pickThumbnailFromRecord(thumbnails, thumbnailSize);
		if (thumbnailUrl) {
			// Check if we have a full image available
			const fullImagePath = getFullImagePath();
			// If thumbnail path looks like it might not exist and we have full image, use full image
			if (fullImagePath && isThumbnailPath(thumbnailUrl)) {
				// For Google Drive, thumbnails might not exist, so use full image directly
				return fullImagePath;
			}
			return constructStorageUrl(thumbnailUrl, provider, storageOwnerId);
		}
	}

	// Check thumbnailPath (if preferThumbnail is true)
	if (preferThumbnail && photo.storage.thumbnailPath) {
		const fullImagePath = getFullImagePath();
		let pathValue = photo.storage.thumbnailPath;
		if (thumbnailSize === 'small' && pathValue.includes('/medium/')) {
			pathValue = pathValue.replace('/medium/', '/small/');
		}

		// If thumbnailPath looks like a thumbnail AND we have a full image, use full image directly
		// This prevents 404s for Google Drive where thumbnails might not exist
		if (fullImagePath && isThumbnailPath(pathValue)) {
			return fullImagePath;
		}

		return constructStorageUrl(pathValue, provider, storageOwnerId);
	}

	// Fallback to url (checking if it's not a thumbnail)
	if (photo.storage.url) {
		const urlPath = photo.storage.url;
		if (!isThumbnailPath(urlPath)) {
			return constructStorageUrl(urlPath, provider, storageOwnerId);
		}
	}

	// Fallback to path (checking if it's not a thumbnail)
	if (photo.storage.path) {
		const pathValue = photo.storage.path;
		if (!isThumbnailPath(pathValue)) {
			return constructStorageUrl(pathValue, provider, storageOwnerId);
		}
	}

	// Final fallback - use thumbnailPath even if it's a thumbnail (better than nothing)
	if (photo.storage.thumbnailPath) {
		return constructStorageUrl(photo.storage.thumbnailPath, provider, storageOwnerId);
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
	const storageOwnerId = resolveStorageOwnerId(photo.storage);

	// For full image, prefer url or path over thumbnailPath
	if (photo.storage.url) {
		const url = constructStorageUrl(photo.storage.url, provider, storageOwnerId);
		// Skip thumbnail paths
		if (!url.includes('/medium/') && !url.includes('/small/') && !url.includes('/thumb/')) {
			return url;
		}
	}

	// Try path if available
	if (photo.storage.path) {
		const path = constructStorageUrl(photo.storage.path, provider, storageOwnerId);
		// Skip thumbnail paths
		if (!path.includes('/medium/') && !path.includes('/small/') && !path.includes('/thumb/')) {
			return path;
		}
	}

	// Fallback to thumbnailPath if no url/path available
	return getPhotoUrl(photo, { preferThumbnail: true, fallback });
}
