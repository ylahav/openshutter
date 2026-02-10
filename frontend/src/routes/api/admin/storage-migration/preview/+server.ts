import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendPost, parseBackendResponse } from '$lib/utils/backend-api';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	const body = await request.json().catch(() => ({}));
	const response = await backendPost('/admin/storage-migration/preview', body, { cookies });
	if (!response.ok) {
		const err = await response.json().catch(() => ({ error: response.statusText }));
		return json(err, { status: response.status });
	}
	const data = await parseBackendResponse(response);
	return json(data);
};
