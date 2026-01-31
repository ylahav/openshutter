import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';
import { logger } from '$lib/utils/logger';

/**
 * Load photo server-side so the same request cookies (auth) are used.
 * Fixes "You need to be logged in" when owner opens /owner/photos/[id]/edit
 * (client-side fetch to /api/admin/photos/[id] was not sending auth in some cases).
 */
export const load: PageServerLoad = async ({ params, cookies, locals }) => {
	if (!locals.user || (locals.user.role !== 'owner' && locals.user.role !== 'admin')) {
		throw redirect(303, `/login?redirect=${encodeURIComponent(`/owner/photos/${params.id}/edit`)}`);
	}

	const id = params.id;
	if (!id) {
		throw error(400, 'Photo ID is required');
	}

	const response = await backendGet(`/admin/photos/${id}`, { cookies });

	// Don't redirect on 401: client-side load may have cookies; redirect would send logged-in owners to login
	if (response.status === 401) {
		logger.warn('Owner photo edit load: backend returned 401', { id });
		return { photo: null };
	}

	if (!response.ok) {
		const err = await response.json().catch(() => ({ message: 'Failed to load photo' }));
		logger.warn('Owner photo edit load: photo fetch failed', { status: response.status, id, err });
		throw error(response.status, err.message || err.error || 'Failed to load photo');
	}

	const photo = await parseBackendResponse<any>(response);

	// Normalize faceRecognition for client
	if (photo?.faceRecognition?.faces && Array.isArray(photo.faceRecognition.faces)) {
		photo.faceRecognition = {
			...photo.faceRecognition,
			faces: photo.faceRecognition.faces.map((f: any) => ({
				box: f.box || { x: 0, y: 0, width: 0, height: 0 },
				matchedPersonId: f.matchedPersonId != null ? String(f.matchedPersonId) : undefined,
				confidence: f.confidence,
			})),
		};
	}

	return { photo };
};
