import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const load: PageServerLoad = async ({ cookies, depends }) => {
	depends('admin:translations');

	try {
		const response = await backendGet('/admin/translations/languages', { cookies });
		const result = await parseBackendResponse<unknown[] | { data?: unknown[] }>(response);
		const languages = Array.isArray(result)
			? result
			: Array.isArray(result?.data)
				? result.data
				: [];

		return {
			languages,
			languagesLoadError: null as string | null
		};
	} catch (err) {
		return {
			languages: [] as unknown[],
			languagesLoadError: err instanceof Error ? err.message : 'Failed to load languages'
		};
	}
};
