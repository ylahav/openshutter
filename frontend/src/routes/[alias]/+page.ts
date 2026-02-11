import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const alias = params.alias;

	// Known routes - these have dedicated routes; if we hit this, show 404
	const knownRoutes = ['admin', 'api', 'login', 'albums', 'photos', 'owner', 'page', 'member', 'setup', 'search', 'auth'];
	// Static assets - avoid hitting backend when browser requests favicon etc.
	const staticAssets = ['favicon.ico', 'favicon.svg', 'robots.txt', 'sitemap.xml'];
	const lower = alias?.toLowerCase() || '';
	if (knownRoutes.includes(lower) || staticAssets.includes(lower)) {
		throw error(404, 'Not found');
	}

	if (!alias) {
		throw error(404, 'Not found');
	}

	try {
		const response = await fetch(`/api/pages/${alias}`);
		const result = await response.json();

		if (!response.ok) {
			throw error(response.status === 404 ? 404 : 500, result?.error || 'Page not found');
		}

		const data = result.success ? result.data : result;
		const page = data?.page ?? data;
		const modules = Array.isArray(data?.modules) ? data.modules : [];

		if (!page?.isPublished) {
			throw error(404, 'Page not found');
		}

		return { page, modules };
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to load page');
	}
};
