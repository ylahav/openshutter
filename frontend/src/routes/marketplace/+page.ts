import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
	const category = url.searchParams.get('category') || undefined;
	const q = category ? `?category=${encodeURIComponent(category)}` : '';
	const res = await fetch(`/api/marketplace${q}`);
	const json = await res.json().catch(() => ({ data: [] }));
	return { listings: json.data || [], category: category || null };
};
