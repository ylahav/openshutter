import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { writeFileSync, readFileSync, existsSync, unlinkSync, createWriteStream, statSync } from 'fs';
import { join } from 'path';
import archiver from 'archiver';

interface DeploymentConfig {
	domain: string;
	port: number;
	appName: string;
	projectRoot: string;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const config: DeploymentConfig = await request.json();

		// Validate configuration
		if (!config.domain || config.domain === 'yourdomain.com') {
			return json({ success: false, error: 'Please provide a valid domain name' }, { status: 400 });
		}

		if (!config.port || config.port < 1 || config.port > 65535) {
			return json({ success: false, error: 'Please provide a valid port number' }, { status: 400 });
		}

		if (!config.appName || config.appName.trim() === '') {
			return json({ success: false, error: 'Please provide a valid app name' }, { status: 400 });
		}

		if (!config.projectRoot || config.projectRoot.trim() === '') {
			return json({ success: false, error: 'Please provide a valid project root path' }, { status: 400 });
		}

		const projectRoot = process.cwd();
		const frontendRoot = join(projectRoot, 'frontend');

		// Check if build exists (SvelteKit uses 'build' directory)
		const buildDir = join(frontendRoot, 'build');
		if (!existsSync(buildDir)) {
			return json(
				{
					success: false,
					error: 'Build directory not found. Please run "pnpm build" in the frontend directory first.'
				},
				{ status: 400 }
			);
		}

		// Create ecosystem.config.js for SvelteKit
		const ecosystemConfig = `module.exports = {
    apps: [{
      name: '${config.appName}',
      script: 'node',
      args: 'build/index.js',
      cwd: '${config.projectRoot}',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: ${config.port}
      },
      env_file: '${config.projectRoot}/.env',
      
      // Logging
      log_file: '${config.projectRoot}/logs/combined.log',
      out_file: '${config.projectRoot}/logs/out.log',
      error_file: '${config.projectRoot}/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Auto restart settings
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 4000,
      
      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,
      
      // Process management
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000
    }]
  }`;

		// Write ecosystem.config.js temporarily
		const ecosystemPath = join(frontendRoot, 'ecosystem.config.js');
		writeFileSync(ecosystemPath, ecosystemConfig);

		// Create ZIP archive
		const zipPath = join(projectRoot, `openshutter-deployment-${config.domain}.zip`);
		const output = createWriteStream(zipPath);
		const archive = archiver('zip', { zlib: { level: 9 } });

		return new Promise((resolve, reject) => {
			output.on('close', () => {
				// Read the zip file
				const zipBuffer = readFileSync(zipPath);

				// Clean up temporary ecosystem.config.js
				try {
					unlinkSync(ecosystemPath);
				} catch (e) {
					console.warn('Could not delete temporary ecosystem.config.js:', e);
				}

				// Clean up zip file after a delay (to allow download)
				setTimeout(() => {
					try {
						unlinkSync(zipPath);
					} catch (e) {
						console.warn('Could not delete temporary zip file:', e);
					}
				}, 1000);

				// Return the zip file as a response
				resolve(
					new Response(zipBuffer, {
						status: 200,
						headers: {
							'Content-Type': 'application/zip',
							'Content-Disposition': `attachment; filename="openshutter-deployment-${config.domain}.zip"`,
							'Content-Length': zipBuffer.length.toString()
						}
					})
				);
			});

			archive.on('error', (err: Error) => {
				console.error('Error creating deployment package:', err);
				reject(json({ success: false, error: 'Failed to create deployment package' }, { status: 500 }));
			});

			archive.pipe(output);

			// Add files to archive (SvelteKit specific)
			const filesToInclude = [
				{ path: 'build', name: 'build' },
				{ path: 'public', name: 'public' },
				{ path: 'package.json', name: 'package.json' },
				{ path: 'pnpm-lock.yaml', name: 'pnpm-lock.yaml' },
				{ path: 'vite.config.ts', name: 'vite.config.ts' },
				{ path: 'svelte.config.js', name: 'svelte.config.js' },
				{ path: 'ecosystem.config.js', name: 'ecosystem.config.js' }
			];

			filesToInclude.forEach((file) => {
				const filePath = join(frontendRoot, file.path);
				if (existsSync(filePath)) {
					try {
						const stat = statSync(filePath);
						if (stat.isDirectory()) {
							archive.directory(filePath, file.name);
						} else {
							archive.file(filePath, { name: file.name });
						}
					} catch (error) {
						console.error(`Error adding ${file.path} to archive:`, error);
					}
				}
			});

			archive.finalize();
		});
	} catch (error) {
		console.error('Deployment preparation error:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to prepare deployment: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
