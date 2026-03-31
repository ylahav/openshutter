import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, url }) => {
	const category = url.searchParams.get('category')?.trim() ?? '';
	const pageNum = url.searchParams.get('page') ?? '1';
	const sp = new URLSearchParams({ page: pageNum, limit: '20' });
	if (category) sp.set('category', category);

	try {
		const res = await fetch(`/api/blog?${sp.toString()}`);
		const json = await res.json();
		if (!json.success) {
			return {
				articles: [] as unknown[],
				pagination: { page: 1, limit: 20, total: 0, pages: 0 },
				category,
				loadError: (json.error as string) ?? 'Failed to load articles'
			};
		}
		const payload = json.data as {
			articles?: unknown[];
			pagination?: { page: number; limit: number; total: number; pages: number };
		};
		return {
			articles: payload.articles ?? [],
			pagination: payload.pagination ?? { page: 1, limit: 20, total: 0, pages: 0 },
			category,
			loadError: null as string | null
		};
	} catch {
		return {
			articles: [] as unknown[],
			pagination: { page: 1, limit: 20, total: 0, pages: 0 },
			category,
			loadError: 'Failed to load articles'
		};
	}
};
