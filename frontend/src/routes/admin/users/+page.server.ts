import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const load: PageServerLoad = async ({ cookies, depends, url }) => {
	depends('admin:users');

	const search = url.searchParams.get('search')?.trim() ?? '';
	const role = url.searchParams.get('role') ?? 'all';
	const blocked = url.searchParams.get('blocked') ?? 'all';

	const queryParams = new URLSearchParams();
	if (search) queryParams.set('search', search);
	if (role && role !== 'all') queryParams.set('role', role);
	if (blocked && blocked !== 'all') queryParams.set('blocked', blocked);
	queryParams.set('limit', '100');

	try {
		const endpoint = `/admin/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
		const response = await backendGet(endpoint, { cookies });
		const result = await parseBackendResponse<{ data?: unknown[] } | unknown[]>(response);
		const users = Array.isArray(result)
			? result
			: Array.isArray(result?.data)
				? result.data
				: [];

		return {
			users,
			usersLoadError: null as string | null,
			filters: { search, role, blocked }
		};
	} catch (err) {
		return {
			users: [] as unknown[],
			usersLoadError: err instanceof Error ? err.message : 'Failed to load users',
			filters: { search, role, blocked }
		};
	}
};
