import type { RequestHandler } from './$types';
import { readFile, access, stat } from 'fs/promises';
import { join, normalize, isAbsolute } from 'path';
import { storageConfigService } from '$lib/services/storage/config';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { path: pathSegments } = params;
		// Ensure pathSegments is an array
		const pathArray = Array.isArray(pathSegments) ? pathSegments : (typeof pathSegments === 'string' ? [pathSegments] : []);
		const filePath = pathArray.join('/');
		const decodedPath = decodeURIComponent(filePath);

		// Get local storage configuration
		const localConfig = await storageConfigService.getConfig('local');
		if (!localConfig) {
			return new Response(JSON.stringify({ error: 'Local storage not configured' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const localStoragePath = localConfig.config.basePath;
		let fullPath: string;

		if (isAbsolute(localStoragePath)) {
			fullPath = join(localStoragePath, decodedPath);
		} else {
			fullPath = join(process.cwd(), localStoragePath, decodedPath);
		}

		// Security check: ensure the path is within the storage directory
		const normalizedFullPath = normalize(fullPath);
		let normalizedBasePath: string;

		if (isAbsolute(localStoragePath)) {
			normalizedBasePath = normalize(localStoragePath);
		} else {
			normalizedBasePath = normalize(join(process.cwd(), localStoragePath));
		}

		if (!normalizedFullPath.startsWith(normalizedBasePath)) {
			return new Response(JSON.stringify({ error: 'Access denied' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Check if file exists
		try {
			await access(normalizedFullPath);
		} catch {
			return new Response(JSON.stringify({ error: 'File not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Get file stats
		const stats = await stat(normalizedFullPath);

		if (stats.isDirectory()) {
			return new Response(JSON.stringify({ error: 'Cannot serve directories' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Read file
		const fileBuffer = await readFile(normalizedFullPath);

		// Determine content type
		const ext = normalizedFullPath.split('.').pop()?.toLowerCase() || '';
		const contentType = getContentType(ext);

		// Return file with appropriate headers
		return new Response(new Uint8Array(fileBuffer), {
			headers: {
				'Content-Type': contentType,
				'Content-Length': stats.size.toString(),
				'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
				'Last-Modified': stats.mtime.toUTCString()
			}
		});
	} catch (error) {
		console.error('Error serving local file:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return new Response(JSON.stringify({ error: `Internal server error: ${errorMessage}` }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};

function getContentType(extension: string): string {
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

	return contentTypes[extension] || 'application/octet-stream';
}
