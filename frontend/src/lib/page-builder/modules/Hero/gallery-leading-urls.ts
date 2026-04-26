import { getPhotoFullUrl } from '$lib/utils/photoUrl';

/** Resolve API photo JSON to a browser-loadable URL (relative paths → /api/storage/serve/…). */
export function urlFromGalleryLeadingPhoto(photo: unknown): string | null {
	if (!photo || typeof photo !== 'object') return null;
	const url = getPhotoFullUrl(
		photo as {
			storage?: {
				url?: string;
				path?: string;
				thumbnailPath?: string;
				provider?: string;
				thumbnails?: Record<string, string>;
			};
			url?: string;
		}
	);
	return url && url !== '/placeholder.jpg' ? url : null;
}

export function galleryLeadingListFromApiBody(data: unknown): unknown[] {
	if (Array.isArray(data)) return data;
	if (data && typeof data === 'object') {
		const o = data as Record<string, unknown>;
		if (o.success === true && Array.isArray(o.data)) return o.data;
		if (Array.isArray(o.data)) return o.data;
	}
	return [];
}

export function resolveGalleryLeadingUrlsFromApiJson(json: unknown): string[] {
	return galleryLeadingListFromApiBody(json)
		.map(urlFromGalleryLeadingPhoto)
		.filter((u): u is string => Boolean(u));
}
