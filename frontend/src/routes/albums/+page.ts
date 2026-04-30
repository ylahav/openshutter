import type { PageLoad } from './$types';
import { logger } from '$lib/utils/logger';

export const load: PageLoad = async ({ fetch, parent }) => {
	const { visitorTemplatePack } = await parent();
	const pack = typeof visitorTemplatePack === 'string' ? visitorTemplatePack : 'atelier';

	try {
		const response = await fetch(`/api/pages/gallery?role=gallery&pack=${encodeURIComponent(pack)}`);
		if (!response.ok) {
			logger.error('[Gallery] Failed to fetch DB gallery page:', response.status, response.statusText);
			return { page: null, modules: [] };
		}

		const result = await response.json();
		const payload = result?.success ? result?.data : result;
		return {
			page: payload?.page ?? payload ?? null,
			modules: Array.isArray(payload?.modules) ? payload.modules : []
		};
	} catch (err) {
		logger.error('[Gallery] Error fetching DB gallery page:', err);
		return { page: null, modules: [] };
	}
};
