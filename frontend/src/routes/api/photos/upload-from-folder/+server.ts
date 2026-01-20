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

		// Get JSON body from request
		const body = await request.json();
		const { folderPath, albumId, title, description, tags } = body;

		if (!folderPath) {
			return json({ success: false, error: 'folderPath is required' }, { status: 400 });
		}

		console.log(`[Photo Upload From Folder API] Received request:`, {
			folderPath,
			albumId,
			hasTitle: !!title,
			hasDescription: !!description,
			tagsCount: tags?.length || 0
		});

		// Extract auth token from cookies
		const authToken = cookies.get('auth_token');

		// Build headers for backend request
		const headers: HeadersInit = {
			'Content-Type': 'application/json'
		};
		if (authToken) {
			headers['Authorization'] = `Bearer ${authToken}`;
			headers['Cookie'] = `auth_token=${authToken}`;
		}

		// Forward request to backend
		const backendUrl = `${API_BASE}/photos/upload-from-folder`;
		console.log(`[Photo Upload From Folder API] Proxying request to backend: ${backendUrl}`);

		const backendResponse = await fetch(backendUrl, {
			method: 'POST',
			headers: headers,
			body: JSON.stringify({
				folderPath,
				albumId,
				title,
				description,
				tags
			})
		});

		// Get response data
		const responseData = await backendResponse.json().catch(() => {
			// If response isn't JSON, return error
			return { error: `Backend returned ${backendResponse.status}: ${backendResponse.statusText}` };
		});

		// Forward the backend response
		if (!backendResponse.ok) {
			console.error('[Photo Upload From Folder API] Backend error:', {
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

		console.log('[Photo Upload From Folder API] Upload successful');
		return json(responseData, { status: backendResponse.status });
	} catch (error) {
		console.error('[Photo Upload From Folder API] Error proxying request:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json({ success: false, error: errorMessage || 'Failed to upload from folder' }, { status: 500 });
	}
};
