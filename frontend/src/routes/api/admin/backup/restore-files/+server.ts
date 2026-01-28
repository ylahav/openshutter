import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { promises as fs, createWriteStream } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import yauzl from 'yauzl';
import { logger } from '$lib/utils/logger';
import { parseError } from '$lib/utils/errorHandler';

const pipelineAsync = promisify(pipeline);

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const formData = await request.formData();
		const file = formData.get('backup') as File;

		if (!file) {
			return json({ success: false, error: 'No backup file provided' }, { status: 400 });
		}

		// Convert File to Buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Extract zip file
		return new Promise((resolve) => {
			yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zipfile) => {
				if (err) {
					logger.error('Zip extraction error:', err);
					resolve(
						json(
							{ success: false, error: 'Failed to extract backup file' },
							{ status: 500 }
						)
					);
					return;
				}

				if (!zipfile) {
					resolve(json({ success: false, error: 'Invalid zip file' }, { status: 400 }));
					return;
				}

				const extractedFiles: string[] = [];

				zipfile.readEntry();
				zipfile.on('entry', (entry) => {
					if (/\/$/.test(entry.fileName)) {
						// Directory entry
						zipfile.readEntry();
					} else {
						// File entry
						zipfile.openReadStream(entry, (err, readStream) => {
							if (err) {
								logger.error('Error reading file from zip:', err);
								zipfile.readEntry();
								return;
							}

							if (!readStream) {
								zipfile.readEntry();
								return;
							}

							const projectRoot = process.cwd();
							const outputPath = join(projectRoot, entry.fileName);
							const pathParts = entry.fileName.split(/[/\\]/);
							const outputDir = pathParts.length > 1 ? join(projectRoot, ...pathParts.slice(0, -1)) : projectRoot;

							// Ensure directory exists
							fs.mkdir(outputDir, { recursive: true })
								.then(() => {
									const writeStream = createWriteStream(outputPath);

									readStream.pipe(writeStream);
									writeStream.on('close', () => {
										extractedFiles.push(entry.fileName);
										zipfile.readEntry();
									});
									writeStream.on('error', (err) => {
										logger.error('Error writing file:', err);
										zipfile.readEntry();
									});
								})
								.catch((err) => {
									logger.error('Error creating directory:', err);
									zipfile.readEntry();
								});
						});
					}
				});

				zipfile.on('end', () => {
					resolve(
						json({
							success: true,
							message: `Files restored successfully. Extracted ${extractedFiles.length} files.`,
							extractedFiles
						})
					);
				});

				zipfile.on('error', (err) => {
					logger.error('Zip file error:', err);
					resolve(
						json(
							{ success: false, error: 'Failed to process backup file' },
							{ status: 500 }
						)
					);
				});
			});
		});
	} catch (error) {
		logger.error('Files restore error:', error);
		const parsed = parseError(error);
		return json(
			{ success: false, error: parsed.userMessage || `Failed to restore files: ${parsed.message}` },
			{ status: parsed.status || 500 }
		);
	}
};
