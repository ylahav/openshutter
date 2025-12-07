import type { RequestHandler } from './$types';
import { storageManager } from '$lib/services/storage/manager';
import { CacheManager } from '$lib/services/cache-manager';

export const GET: RequestHandler = async ({ params, request }) => {
	try {
		const { path: pathSegments } = await params;
		const filePath = pathSegments.join('/');
		const decodedPath = decodeURIComponent(filePath);

		// Extract provider and file path from the URL
		// Expected format: /api/storage/serve/{provider}/{filepath}
		const pathParts = decodedPath.split('/').filter(Boolean); // Remove empty parts
		if (pathParts.length < 2) {
			console.error('Storage API: Invalid path format', { decodedPath, pathParts });
			return new Response(
				JSON.stringify({ error: 'Invalid path format. Expected: /api/storage/serve/{provider}/{filepath}' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		const provider = pathParts[0] as 'local' | 'google-drive' | 'aws-s3' | 'backblaze' | 'wasabi';
		const filePathParts = pathParts.slice(1);
		const fullFilePath = filePathParts.join('/');

		// Get file info from storage manager
		const fileInfo = await storageManager.getPhotoInfo(fullFilePath, provider);
		if (!fileInfo) {
			console.error('Storage API: File not found', { fullFilePath, provider, decodedPath });
			return new Response(
				JSON.stringify({ error: 'File not found', path: fullFilePath, provider }),
				{
					status: 404,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		console.log(`Storage API: Getting file buffer for provider: ${provider}, path: ${fullFilePath}`);

		// Read file buffer from storage
		const fileBuffer = await storageManager.getPhotoBuffer(provider, fullFilePath);
		if (!fileBuffer) {
			console.error(`Storage API: Failed to get file buffer for provider: ${provider}, path: ${fullFilePath}`);
			return new Response(JSON.stringify({ error: 'Failed to read file' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		console.log(`Storage API: Successfully got file buffer, size: ${fileBuffer.length} bytes`);

		// Determine content type and cache strategy
		const ext = fullFilePath.split('.').pop()?.toLowerCase();
		const contentType = getContentType(ext);

		// Determine if this is a thumbnail or full image
		const isThumbnail =
			fullFilePath.includes('/thumb/') ||
			fullFilePath.includes('/micro/') ||
			fullFilePath.includes('/small/') ||
			fullFilePath.includes('/medium/') ||
			fullFilePath.includes('/large/') ||
			fullFilePath.includes('/hero/');

		const cacheType = isThumbnail ? 'thumbnails' : 'images';

		// Check if client has a valid cached version
		if (CacheManager.shouldServeFromCache(request, cacheType)) {
			return new Response(null, { status: 304 });
		}

		// Create response with advanced caching headers
		const response = new Response(new Uint8Array(fileBuffer), {
			headers: {
				'Content-Type': contentType,
				'Content-Length': fileBuffer.length.toString(),
				'Last-Modified': new Date().toUTCString()
			}
		});

		// Apply advanced cache headers
		return CacheManager.applyCacheHeaders(response, cacheType);
	} catch (error) {
		console.error('Error serving file:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return new Response(JSON.stringify({ error: `Internal server error: ${errorMessage}` }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

function getContentType(extension?: string): string {
	const contentTypes: Record<string, string> = {
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.png': 'image/png',
		'.gif': 'image/gif',
		'.webp': 'image/webp',
		'.svg': 'image/svg+xml',
		'.ico': 'image/x-icon',
		'.bmp': 'image/bmp',
		'.tiff': 'image/tiff',
		'.tif': 'image/tiff'
	};

	return contentTypes[extension || ''] || 'application/octet-stream';
}
