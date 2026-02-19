import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const res = await fetch(`/api/marketplace/${params.id}`);
	const json = await res.json().catch(() => ({ data: null }));
	return { listing: json.data };
};
