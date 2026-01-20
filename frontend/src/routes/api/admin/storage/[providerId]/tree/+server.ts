import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ params, url, locals, cookies }) => {
	try {
		// Check admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const { providerId } = params;
		if (!providerId) {
			return json({ success: false, error: 'Provider ID is required' }, { status: 400 });
		}

		// Get query parameters
		const path = url.searchParams.get('path') || undefined;
		const maxDepth = url.searchParams.get('maxDepth') || '10';

		// Build query string
		const queryParams = new URLSearchParams();
		if (path) queryParams.set('path', path);
		if (maxDepth) queryParams.set('maxDepth', maxDepth);

		const endpoint = `/admin/storage/${providerId}/tree${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

		// Get tree from backend
		const response = await backendGet(endpoint, { cookies });
		
		// The backend returns { success: true, providerId, data: tree }
		// parseBackendResponse will unwrap it to just the data object
		// But we want to preserve the full response format for the frontend
		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			return json(
				{ success: false, error: errorData.error || errorData.message || `HTTP ${response.status}` },
				{ status: response.status }
			);
		}

		const result = await response.json().catch(() => null);
		
		console.log('[storage tree] Backend response:', {
			providerId,
			hasData: !!result?.data,
			success: result?.success,
			hasTree: !!(result?.data || result)
		});

		// Return the full response structure
		return json(result || { success: false, error: 'No data returned' });
	} catch (error) {
		console.error('[storage tree] Failed to get tree:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: errorMessage || 'Failed to get folder tree' },
			{ status: 500 }
		);
	}
};
