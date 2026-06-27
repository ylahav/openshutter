import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendRequest, parseBackendResponse, AuthenticationError } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

/**
 * Replace the image binary behind a photo. Forwards a multipart `file` field to
 * `POST /api/admin/photos/:id/replace` on the backend, which preserves the photo
 * `_id`, album placement, tags, description, comments, etc. and only swaps the
 * underlying file + thumbnails + EXIF.
 *
 * Admin or owner-of-album access enforced backend-side.
 */
export const POST: RequestHandler = async ({ params, request, locals, cookies }) => {
	try {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'owner')) {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}
		const { id } = await params;
		if (!id) {
			return json({ success: false, error: 'Photo id is required' }, { status: 400 });
		}

		const formData = await request.formData();
		const file = formData.get('file');
		if (!(file instanceof File)) {
			return json({ success: false, error: 'No file provided' }, { status: 400 });
		}

		const forwardForm = new FormData();
		forwardForm.append('file', file, file.name);

		const response = await backendRequest(`/admin/photos/${encodeURIComponent(id)}/replace`, {
			method: 'POST',
			body: forwardForm,
			cookies,
		});
		const data = await parseBackendResponse<unknown>(response);
		return json({ success: true, data });
	} catch (error) {
		logger.error('API: replace photo failed:', error);
		if (error instanceof AuthenticationError) {
			return json({ success: false, error: error.message }, { status: error.statusCode ?? 401 });
		}
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || 'Failed to replace photo' },
			{ status: parsed.status ?? 500 }
		);
	}
};
