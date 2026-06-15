import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const load: PageServerLoad = async ({ cookies, depends, url }) => {
	depends('admin:people');

	const search = url.searchParams.get('search')?.trim() ?? '';

	const queryParams = new URLSearchParams();
	if (search) queryParams.set('search', search);
	queryParams.set('limit', '500');

	try {
		const endpoint = `/admin/people${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
		const response = await backendGet(endpoint, { cookies });
		const result = await parseBackendResponse<{ data?: unknown[] } | unknown[]>(response);
		const people = Array.isArray(result)
			? result
			: Array.isArray(result?.data)
				? result.data
				: [];

		return {
			people,
			peopleLoadError: null as string | null,
			filters: { search }
		};
	} catch (err) {
		return {
			people: [] as unknown[],
			peopleLoadError: err instanceof Error ? err.message : 'Failed to load people',
			filters: { search }
		};
	}
};
