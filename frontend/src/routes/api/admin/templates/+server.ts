import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { backendGet, backendPut, parseBackendResponse } from '$lib/utils/backend-api';

export const GET: RequestHandler = async ({ locals, cookies, request }) => {
	try {
		// Log for debugging authentication issues
		const token = cookies.get('auth_token');
		console.log('[Templates API] Request received:', {
			hasUser: !!locals.user,
			userRole: locals.user?.role,
			hasCookie: !!token,
			tokenLength: token?.length || 0,
			path: request.url,
			allCookies: cookies.getAll().map(c => c.name)
		});

		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			// Log for debugging
			console.warn('[Templates API] Unauthorized access attempt:', {
				hasUser: !!locals.user,
				userRole: locals.user?.role,
				hasCookie: !!token,
				tokenPreview: token ? token.substring(0, 30) + '...' : 'none',
				allCookies: cookies.getAll().map(c => c.name)
			});
			return json({ 
				success: false, 
				error: 'Invalid or expired token',
				authError: true 
			}, { status: 401 });
		}

		// Log before making backend request
		console.log('[Templates API] Making backend request with cookies:', {
			hasCookies: !!cookies,
			authTokenPresent: !!cookies.get('auth_token'),
			tokenLength: cookies.get('auth_token')?.length || 0
		});

		const response = await backendGet('/admin/templates', { cookies });
		
		// Check response status before parsing
		if (!response.ok) {
			const errorText = await response.text().catch(() => 'Unknown error');
			let errorData;
			try {
				errorData = JSON.parse(errorText);
			} catch {
				errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
			}
			
			// Provide more specific error messages
			if (response.status === 401 || response.status === 403) {
				// Return auth error that client can detect
				return json({ 
					success: false, 
					error: 'Invalid or expired token',
					authError: true 
				}, { status: 401 });
			} else if (response.status === 500) {
				throw new Error(errorData.error || errorData.message || 'Backend server error');
			} else if (response.status === 404) {
				throw new Error('Templates endpoint not found. Check backend configuration.');
			} else {
				throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`);
			}
		}

		const templates = await parseBackendResponse<any>(response);

		// Validate templates array
		if (!Array.isArray(templates)) {
			console.error('Invalid templates response:', templates);
			throw new Error('Invalid response format: expected array of templates');
		}

		return json({ success: true, data: templates });
	} catch (error) {
		console.error('API: Error getting templates:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		
		// Check for network/connection errors
		if (errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('network')) {
			return json({ 
				success: false, 
				error: 'Cannot connect to backend server. Please ensure the backend is running on port 5000.' 
			}, { status: 503 });
		}
		
		return json({ success: false, error: errorMessage || 'Failed to get templates' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { templateName } = body;

		if (!templateName || typeof templateName !== 'string') {
			return json({ success: false, error: 'templateName is required' }, { status: 400 });
		}

		// Update via site-config endpoint (backend handles this)
		const response = await backendPut('/admin/templates', { templateName }, { cookies });
		const result = await parseBackendResponse<{ success?: boolean; message?: string }>(response);

		return json({
			success: result.success !== undefined ? result.success : true,
			message: result.message || 'Template updated successfully'
		});
	} catch (error) {
		console.error('API: Error setting template:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to set template' }, { status: 500 });
	}
};
