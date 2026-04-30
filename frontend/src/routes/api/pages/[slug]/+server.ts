import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { BackendHttpError, backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { forwardedHostHeadersFromRequest } from '$lib/server/forward-host';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';
import { buildTemplateAwareAliasCandidates } from '$lib/utils/template-page-alias';

export const GET: RequestHandler = async ({ params, cookies, url, request }) => {
	try {
		const { slug } = params;
		const role = url.searchParams.get('role');
		const pack = url.searchParams.get('pack') || url.searchParams.get('frontendTemplate');
		const headers = forwardedHostHeadersFromRequest(request);
		const aliasCandidates = buildTemplateAwareAliasCandidates(slug, pack);
		let pageData: { page: any; modules: any[] } | null = null;

		for (const candidateAlias of aliasCandidates) {
			const qs = new URLSearchParams();
			if (role) qs.set('role', role);
			if (pack) qs.set('pack', pack);
			const qstr = qs.toString();

			try {
				const response = await backendGet(`/pages/${candidateAlias}${qstr ? `?${qstr}` : ''}`, {
					cookies,
					headers
				});
				pageData = await parseBackendResponse<{ page: any; modules: any[] }>(response);
				break;
			} catch (error) {
				if (error instanceof BackendHttpError && error.statusCode === 404) {
					continue;
				}
				throw error;
			}
		}

		if (!pageData) {
			return json(
				{
					success: false,
					error: `Page not found: ${slug}`
				},
				{ status: 404 }
			);
		}

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
