import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const load: PageServerLoad = async ({ cookies, depends, url }) => {
	depends('admin:tags');

	const search = url.searchParams.get('search')?.trim() ?? '';
	const category = url.searchParams.get('category') ?? 'all';

	const queryParams = new URLSearchParams();
	if (search) queryParams.set('search', search);
	if (category && category !== 'all') queryParams.set('category', category);
	queryParams.set('limit', '500');

	try {
		const endpoint = `/admin/tags${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
		const response = await backendGet(endpoint, { cookies });
		const result = await parseBackendResponse<{ data?: unknown[] } | unknown[]>(response);
		const tags = Array.isArray(result)
			? result
			: Array.isArray(result?.data)
				? result.data
				: [];

		return {
			tags,
			tagsLoadError: null as string | null,
			filters: { search, category }
		};
	} catch (err) {
		return {
			tags: [] as unknown[],
			tagsLoadError: err instanceof Error ? err.message : 'Failed to load tags',
			filters: { search, category }
		};
	}
};
