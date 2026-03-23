import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const GET: RequestHandler = async ({ params, url, locals, cookies }) => {
	try {
		// Require admin or owner
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'owner')) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { id } = await params;
		if (!id) {
			return json({ success: false, error: 'Photo ID is required' }, { status: 400 });
		}

		const maxSuggestions = url.searchParams.get('maxSuggestions');
		const sources = url.searchParams.get('sources');
		const query = new URLSearchParams();
		if (maxSuggestions) query.set('maxSuggestions', maxSuggestions);
		if (sources) query.set('sources', sources);
		const qs = query.toString();

		const response = await backendGet(
			`/admin/photos/${id}/suggest-tags-from-context${qs ? `?${qs}` : ''}`,
			{ cookies }
		);
		const result = await parseBackendResponse<any>(response);

		return json({
			success: result.success !== undefined ? result.success : true,
			data: result.data || result,
		});
	} catch (error) {
		logger.error('Suggest tags from context API error:', error);
		const parsed = parseError(error);
		return json(
			{
				success: false,
				error: parsed.userMessage || 'Failed to suggest tags from context',
			},
			{ status: parsed.status || 500 }
		);
	}
};
