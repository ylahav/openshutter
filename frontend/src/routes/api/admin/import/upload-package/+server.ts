import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendRequest, parseBackendResponse, AuthenticationError } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

type UploadPackageResponse = {
	success: boolean;
	sourcePath: string;
	fileName: string;
	size: number;
};

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const formData = await request.formData();
		const file = formData.get('file');
		if (!(file instanceof File)) {
			return json({ success: false, error: 'No file provided' }, { status: 400 });
		}

		const forwardForm = new FormData();
		forwardForm.append('file', file, file.name);

		const response = await backendRequest('/admin/import/upload-package', {
			method: 'POST',
			body: forwardForm,
			cookies,
		});
		const data = await parseBackendResponse<UploadPackageResponse>(response);
		return json(data);
	} catch (error) {
		logger.error('API: upload import package failed:', error);
		if (error instanceof AuthenticationError) {
			return json({ success: false, error: error.message }, { status: error.statusCode ?? 401 });
		}
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to upload package' },
			{ status: parsed.status ?? 500 },
		);
	}
};
