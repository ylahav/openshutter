import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const load: PageServerLoad = async ({ params, cookies, depends }) => {
	depends(`admin:album:${params.id}`);

	const id = params.id;

	try {
		const [albumResponse, photosResponse] = await Promise.all([
			backendGet(`/admin/albums/${id}`, { cookies }),
			backendGet(`/admin/albums/${id}/photos`, { cookies })
		]);

		const albumResult = await parseBackendResponse<{ data?: unknown } | unknown>(albumResponse);
		const photosResult = await parseBackendResponse<{ data?: unknown[]; success?: boolean } | unknown[]>(
			photosResponse
		);

		const album =
			albumResult && typeof albumResult === 'object' && 'data' in albumResult
				? albumResult.data
				: albumResult;

		let photos: unknown[] = [];
		if (Array.isArray(photosResult)) {
			photos = photosResult;
		} else if (photosResult && typeof photosResult === 'object' && Array.isArray(photosResult.data)) {
			photos = photosResult.data;
		}

		return {
			album,
			photos,
			loadError: null as string | null
		};
	} catch (err) {
		return {
			album: null,
			photos: [] as unknown[],
			loadError: err instanceof Error ? err.message : 'Failed to load album'
		};
	}
};
