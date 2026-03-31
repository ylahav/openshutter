import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch, params }) => {
	const slug = params.slug?.trim().toLowerCase() ?? '';
	if (!slug) {
		return { article: null as Record<string, unknown> | null, loadError: 'Not found' };
	}

	try {
		const res = await fetch(`/api/blog/${encodeURIComponent(slug)}`);
		const json = await res.json();
		if (!res.ok || !json.success) {
			return {
				article: null as Record<string, unknown> | null,
				loadError: (json.error as string) || 'Not found'
			};
		}
		const payload = json.data as { article?: Record<string, unknown> };
		return { article: payload.article ?? null, loadError: null as string | null };
	} catch {
		return { article: null as Record<string, unknown> | null, loadError: 'Failed to load article' };
	}
};
