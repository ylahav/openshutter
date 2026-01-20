import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const searchParams = url.searchParams;
		const clientId = searchParams.get('clientId');
		const redirectUri = searchParams.get('redirectUri');
		const storageType = searchParams.get('storageType');

		if (!clientId || !redirectUri) {
			return json({ success: false, error: 'clientId and redirectUri are required' }, { status: 400 });
		}

		// Build query string for backend
		const queryParams = new URLSearchParams();
		queryParams.set('clientId', clientId);
		queryParams.set('redirectUri', redirectUri);
		if (storageType) {
			queryParams.set('storageType', storageType);
		}

		const endpoint = `/admin/storage/google-drive/auth-url?${queryParams.toString()}`;
		const response = await backendGet(endpoint, { cookies });
		
		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: 'Failed to generate OAuth URL' }));
			return json({ success: false, error: error.error || 'Failed to generate OAuth URL' }, { status: response.status });
		}

		const result = await response.json();
		return json(result);
	} catch (error) {
		console.error('Google Drive auth URL generation error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to generate OAuth URL' }, { status: 500 });
	}
};
