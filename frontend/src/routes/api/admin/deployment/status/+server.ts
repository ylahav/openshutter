import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { execSync } from 'child_process';
import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Require admin access
		if (!locals.user || locals.user.role !== 'admin') {
			return json({ success: false, error: 'Forbidden' }, { status: 403 });
		}

		const projectRoot = process.cwd();
		const frontendRoot = join(projectRoot, 'frontend');
		const backendRoot = join(projectRoot, 'backend');

		// Check if build directories exist
		const frontendBuildExists =
			existsSync(join(frontendRoot, 'build')) || existsSync(join(frontendRoot, '.svelte-kit'));
		const backendBuildExists = existsSync(join(backendRoot, 'dist'));

		// Check package.json versions
		let frontendVersion = 'unknown';
		let backendVersion = 'unknown';
		try {
			const frontendPkg = JSON.parse(readFileSync(join(frontendRoot, 'package.json'), 'utf-8'));
			frontendVersion = frontendPkg.version || 'unknown';
		} catch (e) {
			// Ignore
		}
		try {
			const backendPkg = JSON.parse(readFileSync(join(backendRoot, 'package.json'), 'utf-8'));
			backendVersion = backendPkg.version || 'unknown';
		} catch (e) {
			// Ignore
		}

		// Check for deployment packages
		const deploymentPackages: Array<{
			name: string;
			size: number;
			sizeFormatted: string;
			modified: Date;
		}> = [];
		const deploymentFiles = [
			'openshutter-deployment.zip',
			'openshutter-deployment.tar.gz',
			'openshutter-image.tar'
		];

		for (const file of deploymentFiles) {
			const filePath = join(projectRoot, file);
			if (existsSync(filePath)) {
				const stats = statSync(filePath);
				deploymentPackages.push({
					name: file,
					size: stats.size,
					sizeFormatted: formatBytes(stats.size),
					modified: stats.mtime
				});
			}
		}

		// Check Node.js version
		let nodeVersion = 'unknown';
		try {
			nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
		} catch (e) {
			// Ignore
		}

		// Check if Docker is available
		let dockerAvailable = false;
		let dockerVersion = 'unknown';
		try {
			dockerVersion = execSync('docker --version', { encoding: 'utf-8' }).trim();
			dockerAvailable = true;
		} catch (e) {
			// Docker not available
		}

		// Check if PM2 is available
		let pm2Available = false;
		let pm2Version = 'unknown';
		try {
			pm2Version = execSync('pm2 --version', { encoding: 'utf-8' }).trim();
			pm2Available = true;
		} catch (e) {
			// PM2 not available
		}

		const status = {
			project: {
				frontend: {
					version: frontendVersion,
					buildExists: frontendBuildExists,
					path: frontendRoot
				},
				backend: {
					version: backendVersion,
					buildExists: backendBuildExists,
					path: backendRoot
				}
			},
			environment: {
				nodeVersion,
				docker: {
					available: dockerAvailable,
					version: dockerVersion
				},
				pm2: {
					available: pm2Available,
					version: pm2Version
				}
			},
			deploymentPackages
		};

		return json({
			success: true,
			data: status
		});
	} catch (error) {
		console.error('Error getting deployment status:', error);
		const errorMessage = error instanceof Error ? error.message : String(error);
		return json(
			{ success: false, error: `Failed to get deployment status: ${errorMessage}` },
			{ status: 500 }
		);
	}
};
