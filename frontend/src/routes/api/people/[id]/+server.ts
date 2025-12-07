import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	try {
		const { id } = await params;

		if (!id) {
			return json({ success: false, error: 'Person ID is required' }, { status: 400 });
		}

		// Use admin endpoint to get person (requires authentication)
		const response = await backendGet(`/admin/people/${id}`, { cookies });
		const person = await parseBackendResponse<any>(response);

		return json({
			success: true,
			data: person
		});
	} catch (error) {
		console.error('Failed to get person:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to get person: ${errorMessage}` }, { status: 500 });
	}
};
