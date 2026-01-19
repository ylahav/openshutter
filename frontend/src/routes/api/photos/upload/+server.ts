import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const BACKEND_URL = env.BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';
const API_BASE = `${BACKEND_URL}/api`;

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		// Get FormData from request
		const formData = await request.formData();
		
		// Extract albumId for logging
		const albumId = formData.get('albumId');
		const file = formData.get('file');
		console.log(`[Photo Upload API] Received upload request:`, {
			albumId: albumId?.toString(),
			fileName: file instanceof File ? file.name : 'not a file',
			fileSize: file instanceof File ? file.size : 'unknown'
		});
		
		// Extract auth token from cookies
		const authToken = cookies.get('auth_token');
		
		// Build headers for backend request
		const headers: HeadersInit = {};
		if (authToken) {
			headers['Authorization'] = `Bearer ${authToken}`;
			headers['Cookie'] = `auth_token=${authToken}`;
		}

		// Forward FormData to backend
		const backendUrl = `${API_BASE}/photos/upload`;
		console.log(`[Photo Upload API] Proxying upload to backend: ${backendUrl}`);

		const backendResponse = await fetch(backendUrl, {
			method: 'POST',
			headers: headers,
			body: formData, // FormData can be sent directly
		});

		// Handle 413 Request Entity Too Large (usually nginx blocking)
		if (backendResponse.status === 413) {
			const errorText = await backendResponse.text().catch(() => 'Request Entity Too Large');
			console.error('[Photo Upload API] 413 Error - File too large (likely nginx limit):', {
				status: 413,
				statusText: backendResponse.statusText,
				responseText: errorText.substring(0, 500)
			});
			return json(
				{ 
					success: false, 
					error: 'File too large: The file exceeds the server\'s upload size limit. Please configure nginx with `client_max_body_size 100M;` in your server block. See docs/UPLOAD_LIMITS.md for details.'
				},
				{ status: 413 }
			);
		}

		// Get response data
		const responseData = await backendResponse.json().catch(() => {
			// If response isn't JSON, return error
			return { error: `Backend returned ${backendResponse.status}: ${backendResponse.statusText}` };
		});

		// Forward the backend response
		if (!backendResponse.ok) {
			console.error('[Photo Upload API] Backend error:', {
				status: backendResponse.status,
				statusText: backendResponse.statusText,
				error: responseData
			});
			return json(
				{ 
					success: false, 
					error: responseData.error || responseData.message || `Upload failed: ${backendResponse.statusText}` 
				},
				{ status: backendResponse.status }
			);
		}

		console.log('[Photo Upload API] Upload successful');
		return json(responseData, { status: backendResponse.status });
	} catch (error) {
		console.error('[Photo Upload API] Error proxying upload:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		
		// Check if it's a size-related error
		if (errorMessage.includes('too large') || errorMessage.includes('413') || errorMessage.includes('Request Entity Too Large') || errorMessage.includes('Content-length') || errorMessage.includes('exceeds limit')) {
			return json(
				{ 
					success: false, 
					error: 'File too large: The file exceeds SvelteKit\'s body size limit (default 512KB). Set the BODY_SIZE_LIMIT environment variable to 100M before starting the server. Also ensure nginx has `client_max_body_size 100M;`. See docs/UPLOAD_LIMITS.md for details.'
				},
				{ status: 413 }
			);
		}
		
		return json(
			{ success: false, error: `Failed to upload photo: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
