import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url, fetch }) => {
	const alias = url.searchParams.get('alias');

	if (!alias) {
		return { page: null, modules: [], error: 'No page alias specified' };
	}

	try {
		const response = await fetch(`/api/pages/${alias}`);
		const result = await response.json();

		if (!response.ok) {
			return {
				page: null,
				modules: [],
				error: result?.error || 'Page not found'
			};
		}

		const data = result.success ? result.data : result;
		const page = data?.page ?? data;
		const modules = Array.isArray(data?.modules) ? data.modules : [];

		if (!page?.isPublished) {
			return { page: null, modules: [], error: 'Page is not published' };
		}

		return { page, modules, error: null };
	} catch {
		return { page: null, modules: [], error: 'Failed to load page' };
	}
};
