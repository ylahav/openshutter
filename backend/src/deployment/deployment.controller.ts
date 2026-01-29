import { Controller, Get, Post, Body, UseGuards, BadRequestException, Res, Logger, InternalServerErrorException } from '@nestjs/common';
import { AdminGuard } from '../common/guards/admin.guard';
import { execSync } from 'child_process';
import { existsSync, readFileSync, statSync, writeFileSync, unlinkSync, createWriteStream } from 'fs';
import { join } from 'path';
import archiver from 'archiver';
import { Response } from 'express';

interface DeploymentConfig {
	domain: string;
	port: number;
	appName: string;
	projectRoot: string;
}

@Controller('admin/deployment')
@UseGuards(AdminGuard)
export class DeploymentController {
	private readonly logger = new Logger(DeploymentController.name);
	/**
	 * Get deployment status and information
	 * Path: GET /api/admin/deployment/status
	 */
	@Get('status')
	async getDeploymentStatus() {
		try {
			const projectRoot = process.cwd();
			const frontendRoot = join(projectRoot, 'frontend');
			const backendRoot = join(projectRoot, 'backend');

			// Check if build directories exist
			const frontendBuildExists = existsSync(join(frontendRoot, 'build')) || existsSync(join(frontendRoot, '.next'));
			const backendBuildExists = existsSync(join(backendRoot, 'dist'));

			// Check package.json versions
			let frontendVersion = 'unknown';
			let backendVersion = 'unknown';
			try {
				const frontendPkg = JSON.parse(readFileSync(join(frontendRoot, 'package.json'), 'utf-8'));
				frontendVersion = frontendPkg.version || 'unknown';
			} catch (_e) {
				// Ignore
			}
			try {
				const backendPkg = JSON.parse(readFileSync(join(backendRoot, 'package.json'), 'utf-8'));
				backendVersion = backendPkg.version || 'unknown';
			} catch (_e) {
				// Ignore
			}

			// Check for deployment packages
			const deploymentPackages = [];
			const deploymentFiles = [
				'openshutter-deployment.zip',
				'openshutter-deployment.tar.gz',
				'openshutter-image.tar',
			];

			for (const file of deploymentFiles) {
				const filePath = join(projectRoot, file);
				if (existsSync(filePath)) {
					const stats = statSync(filePath);
					deploymentPackages.push({
						name: file,
						size: stats.size,
						sizeFormatted: this.formatBytes(stats.size),
						modified: stats.mtime,
					});
				}
			}

			// Check Node.js version
			let nodeVersion = 'unknown';
			try {
				nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
			} catch (_e) {
				// Ignore
			}

			// Check if Docker is available
			let dockerAvailable = false;
			let dockerVersion = 'unknown';
			try {
				dockerVersion = execSync('docker --version', { encoding: 'utf-8' }).trim();
				dockerAvailable = true;
			} catch (_e) {
				// Docker not available
			}

			// Check if PM2 is available
			let pm2Available = false;
			let pm2Version = 'unknown';
			try {
				pm2Version = execSync('pm2 --version', { encoding: 'utf-8' }).trim();
				pm2Available = true;
			} catch (_e) {
				// PM2 not available
			}

			return {
				project: {
					frontend: {
						version: frontendVersion,
						buildExists: frontendBuildExists,
						path: frontendRoot,
					},
					backend: {
						version: backendVersion,
						buildExists: backendBuildExists,
						path: backendRoot,
					},
				},
				environment: {
					nodeVersion,
					docker: {
						available: dockerAvailable,
						version: dockerVersion,
					},
					pm2: {
						available: pm2Available,
						version: pm2Version,
					},
				},
				deploymentPackages,
			};
		} catch (error) {
			this.logger.error(`Error getting deployment status: ${error instanceof Error ? error.message : String(error)}`);
			throw new InternalServerErrorException(
				`Failed to get deployment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	/**
	 * Prepare deployment package
	 * Path: POST /api/admin/deployment/prepare
	 */
	@Post('prepare')
	async prepareDeployment(@Body() config: DeploymentConfig, @Res() res: Response) {
		try {
			// Validate configuration
			if (!config.domain || config.domain === 'yourdomain.com') {
				throw new BadRequestException('Please provide a valid domain name');
			}

			if (!config.port || config.port < 1 || config.port > 65535) {
				throw new BadRequestException('Please provide a valid port number');
			}

			if (!config.appName || config.appName.trim() === '') {
				throw new BadRequestException('Please provide a valid app name');
			}

			if (!config.projectRoot || config.projectRoot.trim() === '') {
				throw new BadRequestException('Please provide a valid project root path');
			}

			const projectRoot = process.cwd();
			const frontendRoot = join(projectRoot, 'frontend');

			// Check if build exists, if not return error (building should be done separately)
			const buildDir = join(frontendRoot, 'build');
			const nextDir = join(frontendRoot, '.next');
			if (!existsSync(buildDir) && !existsSync(nextDir)) {
				throw new BadRequestException(
					'Build directory not found. Please run "pnpm build" in the frontend directory first.',
				);
			}

			// Create ecosystem.config.js
			const ecosystemConfig = `module.exports = {
    apps: [{
      name: '${config.appName}',
      script: 'node_modules/.bin/next',
      args: 'start -p ${config.port}',
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

			return new Promise<void>((resolve, reject) => {
				output.on('close', () => {
					// Read the zip file and send as response
					const zipBuffer = readFileSync(zipPath);

					// Clean up temporary ecosystem.config.js
					try {
						unlinkSync(ecosystemPath);
					} catch (e) {
						this.logger.warn(`Could not delete temporary ecosystem.config.js: ${e instanceof Error ? e.message : String(e)}`);
					}

					res.setHeader('Content-Type', 'application/zip');
					res.setHeader(
						'Content-Disposition',
						`attachment; filename="openshutter-deployment-${config.domain}.zip"`,
					);
					res.setHeader('Content-Length', zipBuffer.length.toString());
					res.send(zipBuffer);

					// Clean up zip file after sending
					setTimeout(() => {
						try {
							unlinkSync(zipPath);
						} catch (e) {
							this.logger.warn(`Could not delete temporary zip file: ${e instanceof Error ? e.message : String(e)}`);
						}
					}, 1000);

					resolve();
				});

				archive.on('error', (err: Error) => {
					this.logger.error(`Error creating deployment package: ${err instanceof Error ? err.message : String(err)}`);
					reject(new BadRequestException('Failed to create deployment package'));
				});

				archive.pipe(output);

				// Add files to archive
				const filesToInclude = [
					{ path: '.next', name: '.next' },
					{ path: 'build', name: 'build' },
					{ path: 'public', name: 'public' },
					{ path: 'package.json', name: 'package.json' },
					{ path: 'pnpm-lock.yaml', name: 'pnpm-lock.yaml' },
					{ path: 'vite.config.ts', name: 'vite.config.ts' },
					{ path: 'ecosystem.config.js', name: 'ecosystem.config.js' },
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
							this.logger.error(`Error adding ${file.path} to archive: ${error instanceof Error ? error.message : String(error)}`);
						}
					}
				});

				archive.finalize();
			});
		} catch (error) {
			this.logger.error(`Deployment preparation error: ${error instanceof Error ? error.message : String(error)}`);
			if (error instanceof BadRequestException) {
				throw error;
			}
			throw new BadRequestException(
				`Failed to prepare deployment: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
	}

	private formatBytes(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}
}
