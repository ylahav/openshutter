import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const load: PageServerLoad = async ({ cookies, depends, url }) => {
	depends('admin:pages');

	const search = url.searchParams.get('search')?.trim() ?? '';
	const category = url.searchParams.get('category') ?? 'all';
	const published = url.searchParams.get('published') ?? 'all';

	const queryParams = new URLSearchParams();
	if (search) queryParams.set('search', search);
	if (category && category !== 'all') queryParams.set('category', category);
	if (published && published !== 'all') queryParams.set('published', published);
	queryParams.set('limit', '500');

	try {
		const endpoint = `/admin/pages${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
		const response = await backendGet(endpoint, { cookies });
		const result = await parseBackendResponse<{ data?: unknown[] } | unknown[]>(response);
		const pages = Array.isArray(result)
			? result
			: Array.isArray(result?.data)
				? result.data
				: [];

		return {
			pages,
			pagesLoadError: null as string | null,
			filters: { search, category, published }
		};
	} catch (err) {
		return {
			pages: [] as unknown[],
			pagesLoadError: err instanceof Error ? err.message : 'Failed to load pages',
			filters: { search, category, published }
		};
	}
};
