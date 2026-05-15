import { getPhotoFullUrl, getPhotoUrl } from '$lib/utils/photoUrl';

export interface LightboxPhotoLike {
	url?: string;
	thumbnailUrl?: string;
	storage?: {
		provider?: string;
		url?: string;
		path?: string;
		thumbnailPath?: string;
		thumbnails?: Record<string, string>;
		storageOwnerId?: string;
	};
}

export function resolveLightboxUrls(photo: LightboxPhotoLike): {
	previewUrl: string;
	fullUrl: string;
} {
	const preview =
		(photo.thumbnailUrl && photo.thumbnailUrl.trim()) ||
		getPhotoUrl(photo, { preferThumbnail: true, fallback: '' });
	const full = getPhotoFullUrl(photo, '') || (photo.url && photo.url.trim()) || preview;
	return { previewUrl: preview, fullUrl: full };
}

const loadPromises = new Map<string, Promise<void>>();
const loadedUrls = new Set<string>();
const MAX_CACHE_ENTRIES = 40;

export function isLightboxImageCached(url: string): boolean {
	return !!url && loadedUrls.has(url);
}

/** Decode image into browser cache (shared by <img> and prefetch). */
export function preloadLightboxImage(url: string): Promise<void> {
	if (!url || typeof window === 'undefined') return Promise.resolve();
	if (loadedUrls.has(url)) return Promise.resolve();

	const existing = loadPromises.get(url);
	if (existing) return existing;

	const promise = new Promise<void>((resolve, reject) => {
		const img = new Image();
		img.decoding = 'async';
		img.onload = () => {
			loadedUrls.add(url);
			resolve();
		};
		img.onerror = () => reject(new Error(`Failed to preload: ${url}`));
		img.src = url;
	});

	loadPromises.set(url, promise);
	promise.finally(() => pruneLightboxCache(MAX_CACHE_ENTRIES));
	return promise;
}

/** Drop oldest entries when cache grows (keeps recent neighbors warm). */
export function pruneLightboxCache(maxEntries: number): void {
	if (loadedUrls.size <= maxEntries) return;
	let remaining = loadedUrls.size - maxEntries;
	for (const url of loadedUrls) {
		loadedUrls.delete(url);
		loadPromises.delete(url);
		remaining -= 1;
		if (remaining <= 0) break;
	}
}

export function clearLightboxImageCache(): void {
	loadPromises.clear();
	loadedUrls.clear();
}

export function scheduleIdle(fn: () => void): void {
	if (typeof requestIdleCallback !== 'undefined') {
		requestIdleCallback(() => fn(), { timeout: 2000 });
	} else {
		setTimeout(fn, 80);
	}
}
