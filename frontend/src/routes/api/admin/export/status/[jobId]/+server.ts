import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ params, locals, cookies }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	const { jobId } = params;
	const response = await backendGet(`/admin/export/status/${jobId}`, { cookies });
	if (!response.ok) {
		const err = await response.json().catch(() => ({ error: response.statusText }));
		return json(err, { status: response.status });
	}
	const data = await parseBackendResponse(response);
	return json(data);
};
