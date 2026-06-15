import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

function normalizeStorageConfigs(raw: unknown): unknown[] {
	if (Array.isArray(raw)) return raw;
	if (raw && typeof raw === 'object') {
		const data = (raw as { data?: unknown }).data;
		if (Array.isArray(data)) return data;
	}
	return [];
}

/** SSR load site-wide storage configs — admin role only. Owners use `/api/owner/storage-options` on the client. */
export const load: PageServerLoad = async ({ cookies, parent, depends }) => {
	depends('admin:storage');

	const { user } = await parent();
	const isSiteAdmin = user?.role === 'admin';

	if (!isSiteAdmin) {
		return {
			isSiteAdmin: false as const,
			storageConfigs: null,
			storageLoadError: null as string | null,
		};
	}

	try {
		const response = await backendGet('/admin/storage', { cookies });
		const parsed = await parseBackendResponse<unknown>(response);
		const storageConfigs = normalizeStorageConfigs(parsed);

		return {
			isSiteAdmin: true as const,
			storageConfigs,
			storageLoadError: null as string | null,
		};
	} catch (err) {
		return {
			isSiteAdmin: true as const,
			storageConfigs: [] as unknown[],
			storageLoadError:
				err instanceof Error ? err.message : 'Failed to load storage configuration',
		};
	}
};
