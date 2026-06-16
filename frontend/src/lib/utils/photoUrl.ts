/**
 * Shared utility functions for constructing photo URLs
 * 
 * This module provides a single source of truth for photo URL construction,
 * eliminating code duplication across multiple components.
 */

/** Bump this to bust caches after backend image pipeline changes (e.g. EXIF orientation fix). */
const STORAGE_URL_VERSION = 3;

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
	/** Fallback URL if no photo URL is found (default: '/placeholder.jpg') */
	fallback?: string;
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

	const appendVersion = (url: string): string => {
		if (url.includes('v=')) return url;
		const sep = url.includes('?') ? '&' : '?';
		return `${url}${sep}${param}`;
	};

	if (path.startsWith('/api/storage/serve/') || path.startsWith('http')) {
		const sameOrigin = path.startsWith('http') ? toSameOriginStorageServeUrl(path) : null;
		const servePath = sameOrigin ?? path;
		const normalized =
			servePath.startsWith('/api/storage/serve/') ? normalizeServeStorageUrl(servePath) : servePath;
		const withV = appendVersion(normalized);
		if (servePath.startsWith('/api/storage/serve/')) {
			return appendOwner(withV);
		}
		return withV;
	}

	const cleanPath = path.startsWith('/') ? path.slice(1) : path;
	if (!cleanPath.trim()) {
		return '';
	}
	const base = `/api/storage/serve/${provider}/${encodeStoragePathSegments(cleanPath)}?${param}`;
	return appendOwner(base);
}

/** Encode each path segment for `/api/storage/serve/{provider}/...` (slashes stay as separators). */
function encodeStoragePathSegments(filePath: string): string {
	return filePath
		.split('/')
		.filter((seg) => seg.length > 0)
		.map((seg) => encodeURIComponent(seg))
		.join('/');
}

/** Decode over-encoded serve URLs stored in DB (e.g. `%2F` in a single segment). */
function normalizeServeStorageUrl(url: string): string {
	const qIndex = url.indexOf('?');
	const pathPart = qIndex >= 0 ? url.slice(0, qIndex) : url;
	const query = qIndex >= 0 ? url.slice(qIndex) : '';
	const prefix = '/api/storage/serve/';
	if (!pathPart.startsWith(prefix)) return url;
	const rest = pathPart.slice(prefix.length);
	const slash = rest.indexOf('/');
	if (slash <= 0) return url;
	const provider = rest.slice(0, slash);
	let filePath = rest.slice(slash + 1);
	try {
		while (filePath.includes('%')) {
			const decoded = decodeURIComponent(filePath);
			if (decoded === filePath) break;
			filePath = decoded;
		}
	} catch {
		// keep original
	}
	return `${prefix}${provider}/${encodeStoragePathSegments(filePath)}${query}`;
}

function resolveStorageOwnerId(storage: PhotoStorage | undefined): string | undefined {
	if (!storage?.storageOwnerId) return undefined;
	const s = String(storage.storageOwnerId).trim();
	return s || undefined;
}

/** Extract the storage file path from a serve URL or raw path (for thumbnail detection). */
function extractStorageFilePath(pathOrUrl: string): string {
	const withoutQuery = pathOrUrl.split('?')[0] ?? pathOrUrl;
	const prefix = '/api/storage/serve/';
	if (withoutQuery.startsWith(prefix)) {
		const rest = withoutQuery.slice(prefix.length);
		const slash = rest.indexOf('/');
		if (slash > 0) {
			let filePath = rest.slice(slash + 1);
			try {
				while (filePath.includes('%')) {
					const decoded = decodeURIComponent(filePath);
					if (decoded === filePath) break;
					filePath = decoded;
				}
			} catch {
				// keep as-is
			}
			return filePath;
		}
	}
	if (withoutQuery.startsWith('http://') || withoutQuery.startsWith('https://')) {
		try {
			const u = new URL(withoutQuery);
			if (u.pathname.startsWith(prefix)) {
				return extractStorageFilePath(u.pathname);
			}
		} catch {
			// ignore
		}
	}
	return withoutQuery.startsWith('/') ? withoutQuery.slice(1) : withoutQuery;
}

/** Rewrite absolute backend serve URLs to same-origin relative paths for the SvelteKit proxy. */
function toSameOriginStorageServeUrl(url: string): string | null {
	try {
		const u = new URL(url);
		if (!u.pathname.startsWith('/api/storage/serve/')) return null;
		return `${u.pathname}${u.search}`;
	} catch {
		return null;
	}
}

/** True when a storage path/URL points at a variant rendition folder or prefixed file. */
function isThumbnailPath(path: string): boolean {
	const filePath = extractStorageFilePath(path);
	const lower = filePath.toLowerCase();
	return (
		lower.includes('/hero/') ||
		lower.includes('/large/') ||
		lower.includes('/medium/') ||
		lower.includes('/small/') ||
		lower.includes('/micro/') ||
		lower.includes('/thumb/') ||
		/(?:^|\/)(hero|large|medium|small|micro)-\d{13}-/i.test(filePath)
	);
}

function pickThumbnailFromMap(thumbnails: Record<string, string>): string | undefined {
	return (
		thumbnails.medium ||
		thumbnails.small ||
		thumbnails.large ||
		thumbnails.hero ||
		thumbnails.micro ||
		Object.values(thumbnails).find((u) => u && typeof u === 'string')
	);
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
	const storageOwnerId = resolveStorageOwnerId(photo.storage);

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
		const thumbnailUrl = pickThumbnailFromMap(thumbnails);
		if (thumbnailUrl) {
			const fullImagePath = getFullImagePath();
			// Google Drive variant folders are often missing — prefer the main file
			if (provider === 'google-drive' && fullImagePath && isThumbnailPath(thumbnailUrl)) {
				return fullImagePath;
			}
			return constructStorageUrl(thumbnailUrl, provider, storageOwnerId);
		}
	}

	// Check thumbnailPath (if preferThumbnail is true)
	if (preferThumbnail && photo.storage.thumbnailPath) {
		const fullImagePath = getFullImagePath();
		
		if (provider === 'google-drive' && fullImagePath && isThumbnailPath(photo.storage.thumbnailPath)) {
			return fullImagePath;
		}
		
		// Otherwise use thumbnailPath
		return constructStorageUrl(photo.storage.thumbnailPath, provider, storageOwnerId);
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
 * Best URL for album grids / pickers: thumbnail when available, else full image.
 */
export function getPhotoGridUrl(photo: PhotoLike, fallback: string = ''): string {
	const full = getPhotoFullUrl(photo, '');
	const thumb = getPhotoUrl(photo, { preferThumbnail: true, fallback: '' });
	// Local storage: variant thumbnails are often missing — prefer the main file.
	const provider = photo.storage?.provider || 'local';
	if (provider === 'local' && full) {
		return full;
	}
	if (!thumb) return full || fallback;
	// Variant thumbnails are often missing on restored remote repos — prefer the main file.
	if (full && full !== thumb && isThumbnailPath(thumb)) {
		return full;
	}
	return thumb;
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
		if (url && !isThumbnailPath(url)) {
			return url;
		}
	}

	// Try path if available
	if (photo.storage.path) {
		const path = constructStorageUrl(photo.storage.path, provider, storageOwnerId);
		if (path && !isThumbnailPath(path)) {
			return path;
		}
	}

	// Fallback to thumbnailPath if no url/path available
	return getPhotoUrl(photo, { preferThumbnail: true, fallback });
}
