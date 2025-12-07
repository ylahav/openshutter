import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { id } = await params;

		if (!id) {
			return json({ success: false, error: 'Photo ID is required' }, { status: 400 });
		}

		const response = await backendGet(`/photos/${id}`);
		const photo = await parseBackendResponse<any>(response);

		return json(photo);
	} catch (error) {
		console.error('Failed to get photo:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: `Failed to get photo: ${errorMessage}` }, { status: 500 });
	}
};
