import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ params, cookies }) => {
	try {
		const { slug } = params;
		const response = await backendGet(`/pages/${slug}`, { cookies });
		const pageData = await parseBackendResponse<{ page: any; modules: any[] }>(response);

		return json({
			success: true,
			data: pageData
		});
	} catch (error) {
		console.error('Public page API error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to fetch page' }, { status: 500 });
	}
};
