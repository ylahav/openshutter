import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const load: PageServerLoad = async ({ cookies, depends }) => {
	depends('admin:albums');

	try {
		const response = await backendGet('/admin/albums', { cookies });
		const result = await parseBackendResponse<unknown[] | { data?: unknown[] }>(response);
		const albums = Array.isArray(result)
			? result
			: Array.isArray(result?.data)
				? result.data
				: [];

		return {
			albums,
			albumsLoadError: null as string | null
		};
	} catch (err) {
		return {
			albums: [] as unknown[],
			albumsLoadError: err instanceof Error ? err.message : 'Failed to load albums'
		};
	}
};
