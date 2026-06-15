import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const load: PageServerLoad = async ({ params, cookies, depends }) => {
	depends(`admin:album-edit:${params.id}`);

	try {
		const response = await backendGet(`/admin/albums/${params.id}`, { cookies });
		const result = await parseBackendResponse<{ data?: unknown } | unknown>(response);
		const album =
			result && typeof result === 'object' && 'data' in result ? result.data : result;

		return {
			album,
			loadError: null as string | null
		};
	} catch (err) {
		return {
			album: null,
			loadError: err instanceof Error ? err.message : 'Failed to load album'
		};
	}
};
