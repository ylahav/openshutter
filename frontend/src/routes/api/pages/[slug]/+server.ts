import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params, cookies, url }) => {
	try {
		const { slug } = params;
		const role = url.searchParams.get('role');
		const pack = url.searchParams.get('pack') || url.searchParams.get('frontendTemplate');
		const qs = new URLSearchParams();
		if (role) qs.set('role', role);
		if (pack) qs.set('pack', pack);
		const qstr = qs.toString();
		const response = await backendGet(`/pages/${slug}${qstr ? `?${qstr}` : ''}`, { cookies });
		const pageData = await parseBackendResponse<{ page: any; modules: any[] }>(response);

		return json({
			success: true,
			data: pageData
		});
	} catch (error) {
		logger.error('Public page API error:', error);
		const parsed = parseError(error);
		return json({ 
			success: false, 
			error: parsed.userMessage || 'Failed to fetch page' 
		}, { status: parsed.status || 500 });
	}
};
