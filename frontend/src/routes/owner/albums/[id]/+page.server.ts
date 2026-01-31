import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';

/**
 * Load album and photos server-side so the same request cookies (auth) are used.
 * Fixes owner album page not seeing photos when client-side fetch didn't forward auth.
 */
export const load: PageServerLoad = async ({ params, cookies }) => {
	const id = params.id;
	if (!id) {
		throw error(400, 'Album ID is required');
	}

	const [albumRes, photosRes] = await Promise.all([
		backendGet(`/albums/${id}`, { cookies }),
		backendGet(`/albums/${id}/photos?page=1&limit=200`, { cookies }),
	]);

	if (!albumRes.ok) {
		const err = await albumRes.json().catch(() => ({ message: 'Album not found' }));
		logger.warn('Owner album load: album fetch failed', { status: albumRes.status, id, err });
		throw error(albumRes.status, err.message || err.error || 'Album not found');
	}

	const album = await parseBackendResponse<any>(albumRes);

	let photos: any[] = [];
	if (photosRes.ok) {
		const photosData = await parseBackendResponse<{ photos?: any[]; pagination?: any }>(photosRes);
		photos = Array.isArray(photosData?.photos) ? photosData.photos : [];
	} else {
		logger.warn('Owner album load: photos fetch failed', { status: photosRes.status, id });
	}

	return {
		album,
		photos,
	};
};
