import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
	const category = url.searchParams.get('category') || undefined;
	const featured = url.searchParams.get('featured') || undefined;
	const q = url.searchParams.get('q') || undefined;
	const params = new URLSearchParams();
	if (category) params.set('category', category);
	if (featured === 'true') params.set('featured', 'true');
	if (q?.trim()) params.set('q', q.trim());
	const query = params.toString();
	const res = await fetch(`/api/marketplace${query ? `?${query}` : ''}`);
	const json = await res.json().catch(() => ({ data: [] }));
	const listings = json.data || [];
	return {
		listings,
		category: category || null,
		searchQuery: q?.trim() || null,
	};
};
