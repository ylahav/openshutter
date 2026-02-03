import type { RequestHandler } from './$types';
import { promises as fs } from 'fs';
import { join } from 'path';
import { existsSync } from 'fs';
import archiver from 'archiver';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

export const POST: RequestHandler = async ({ locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Define directories to backup (relative to project root)
		// Note: These are backend storage paths, not frontend static assets
		// Frontend static assets are in the 'static' directory (SvelteKit convention)
		const backupDirectories = [
			'public/uploads',
			'public/logos',
			'public/favicons',
			'public/thumbnails'
		];

		// Create a zip archive
		const archive = archiver('zip', { zlib: { level: 9 } });

		// Create a readable stream for the response
		const stream = new ReadableStream({
			start(controller) {
				archive.on('data', (chunk: Buffer) => {
					controller.enqueue(chunk);
				});

				archive.on('end', () => {
					controller.close();
				});

				archive.on('error', (err: Error) => {
					logger.error('Archive error:', err);
					controller.error(err);
				});
			}
		});

		// Add directories to archive
		const projectRoot = process.cwd();
		for (const dir of backupDirectories) {
			try {
				const fullPath = join(projectRoot, dir);
				if (existsSync(fullPath)) {
					const stats = await fs.stat(fullPath);
					if (stats.isDirectory()) {
						archive.directory(fullPath, dir);
					}
				}
			} catch (error) {
				// Directory doesn't exist, skip it
				logger.debug(`Directory ${dir} doesn't exist, skipping...`);
			}
		}

		// Finalize the archive
		archive.finalize();

		// Set response headers for file download
		const dateStr = new Date().toISOString().split('T')[0];
		return new Response(stream, {
			headers: {
				'Content-Type': 'application/zip',
				'Content-Disposition': `attachment; filename="files-backup-${dateStr}.zip"`
			}
		});
	} catch (error) {
		logger.error('Files backup error:', error);
		const parsed = parseError(error);
		return new Response(
			JSON.stringify({ success: false, error: parsed.userMessage || `Failed to create files backup: ${parsed.message}` }),
			{
				status: parsed.status || 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
