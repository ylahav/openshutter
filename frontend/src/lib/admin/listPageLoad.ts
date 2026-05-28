export type AdminListPageData<T> = {
	initialItems: T[];
	listLoadError: string;
};

/**
 * Shared SvelteKit `load` helper for admin list pages (users, people, groups, …).
 */
export async function loadAdminListPage<T = unknown>(
	fetch: typeof globalThis.fetch,
	endpoint: string,
	options?: {
		limit?: number;
		searchParam?: string;
		searchValue?: string;
		extraParams?: Record<string, string | undefined>;
	},
): Promise<AdminListPageData<T>> {
	try {
		const params = new URLSearchParams();
		if (options?.limit != null) params.set('limit', String(options.limit));
		if (options?.searchParam && options?.searchValue) {
			params.set(options.searchParam, options.searchValue);
		}
		if (options?.extraParams) {
			for (const [key, value] of Object.entries(options.extraParams)) {
				if (value != null && value !== '') params.set(key, value);
			}
		}
		const qs = params.toString();
		const url = qs ? `${endpoint}?${qs}` : endpoint;
		const response = await fetch(url, { credentials: 'include' });
		const result = await response.json().catch(() => ({}));

		if (!response.ok) {
			const message =
				(typeof result === 'object' && result && 'error' in result
					? String((result as { error?: string }).error)
					: null) ||
				(typeof result === 'object' && result && 'message' in result
					? String((result as { message?: string }).message)
					: null) ||
				`Failed to load (${response.status})`;
			return { initialItems: [] as T[], listLoadError: message };
		}

		const initialItems: T[] = Array.isArray(result)
			? result
			: Array.isArray((result as { data?: T[] })?.data)
				? (result as { data: T[] }).data
				: [];

		return { initialItems, listLoadError: '' };
	} catch {
		return { initialItems: [] as T[], listLoadError: 'Failed to load data' };
	}
}
