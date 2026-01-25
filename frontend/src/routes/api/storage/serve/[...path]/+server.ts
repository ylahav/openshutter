import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

// Backend API base URL
const BACKEND_URL = env.BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';

export const GET: RequestHandler = async ({ params, request, cookies }) => {
	try {
		const { path: pathSegments } = await params;
		// Ensure pathSegments is an array
		const pathArray = Array.isArray(pathSegments) ? pathSegments : (typeof pathSegments === 'string' ? [pathSegments] : []);
		const filePath = pathArray.join('/');

		// Extract provider and file path from the URL
		// Expected format: /api/storage/serve/{provider}/{filepath}
		const pathParts = filePath.split('/').filter(Boolean); // Remove empty parts
		if (pathParts.length < 2) {
			console.error('Storage API: Invalid path format', { filePath, pathParts });
			return new Response(
				JSON.stringify({ error: 'Invalid path format. Expected: /api/storage/serve/{provider}/{filepath}' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		const provider = pathParts[0];
		const filePathParts = pathParts.slice(1);
		const fullFilePath = filePathParts.join('/');

		// Encode the file path for the backend URL
		const encodedFilePath = encodeURIComponent(fullFilePath);
		
		// Proxy the request to the backend
		const backendUrl = `${BACKEND_URL}/api/storage/serve/${provider}/${encodedFilePath}`;
		
		// Forward cookies for authentication (if needed)
		const cookieHeader: string[] = [];
		const authCookie = cookies.get('auth_token');
		if (authCookie) {
			cookieHeader.push(`auth_token=${authCookie}`);
		}
		
		const headers: HeadersInit = {
			// Forward any relevant headers from the original request
			'Accept': request.headers.get('Accept') || '*/*',
		};
		
		if (cookieHeader.length > 0) {
			headers['Cookie'] = cookieHeader.join('; ');
		}
		
		console.log(`[Storage Serve] Proxying request: ${backendUrl}`, {
			provider,
			filePath: fullFilePath,
			hasAuthCookie: !!authCookie,
			backendUrl: BACKEND_URL
		});
		
		const backendResponse = await fetch(backendUrl, {
			method: 'GET',
			headers
		});

		if (!backendResponse.ok) {
			const errorText = await backendResponse.text().catch(() => 'Unable to read error');
			console.error(`[Storage Serve] Backend storage API error: ${backendResponse.status} ${backendResponse.statusText}`, {
				backendUrl,
				provider,
				filePath: fullFilePath,
				error: errorText.substring(0, 200)
			});
			return new Response(
				JSON.stringify({ error: `Failed to serve file: ${backendResponse.statusText}`, details: errorText.substring(0, 200) }),
				{
					status: backendResponse.status,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Get the file buffer from the backend response
		const fileBuffer = await backendResponse.arrayBuffer();

		// Get content type from backend response or determine from extension
		let contentType = backendResponse.headers.get('Content-Type') || 'application/octet-stream';
		if (contentType === 'application/octet-stream') {
			const ext = fullFilePath.split('.').pop()?.toLowerCase();
			contentType = getContentType(ext);
		}

		// Create response with appropriate headers
		const response = new Response(new Uint8Array(fileBuffer), {
			headers: {
				'Content-Type': contentType,
				'Content-Length': fileBuffer.byteLength.toString(),
				'Cache-Control': backendResponse.headers.get('Cache-Control') || 'public, max-age=31536000',
				'Last-Modified': backendResponse.headers.get('Last-Modified') || new Date().toUTCString()
			}
		});

		return response;
	} catch (error) {
		console.error('[Storage Serve] Error serving file:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		const errorStack = error instanceof Error ? error.stack : undefined;
		console.error('[Storage Serve] Error details:', {
			message: errorMessage,
			stack: errorStack,
			backendUrl: BACKEND_URL,
			filePath: pathArray?.join('/') || 'unknown'
		});
		return new Response(JSON.stringify({ 
			error: `Internal server error: ${errorMessage}`,
			backendUrl: BACKEND_URL 
		}), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

function getContentType(extension?: string): string {
	const contentTypes: Record<string, string> = {
		'jpg': 'image/jpeg',
		'jpeg': 'image/jpeg',
		'png': 'image/png',
		'gif': 'image/gif',
		'webp': 'image/webp',
		'svg': 'image/svg+xml',
		'ico': 'image/x-icon',
		'bmp': 'image/bmp',
		'tiff': 'image/tiff',
		'tif': 'image/tiff'
	};

	return contentTypes[extension || ''] || 'application/octet-stream';
}
