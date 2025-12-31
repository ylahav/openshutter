"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentController = void 0;
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("../common/guards/admin.guard");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path_1 = require("path");
const archiver_1 = __importDefault(require("archiver"));
let DeploymentController = class DeploymentController {
    /**
     * Get deployment status and information
     * Path: GET /api/admin/deployment/status
     */
    getDeploymentStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const projectRoot = process.cwd();
                const frontendRoot = (0, path_1.join)(projectRoot, 'frontend');
                const backendRoot = (0, path_1.join)(projectRoot, 'backend');
                // Check if build directories exist
                const frontendBuildExists = (0, fs_1.existsSync)((0, path_1.join)(frontendRoot, 'build')) || (0, fs_1.existsSync)((0, path_1.join)(frontendRoot, '.next'));
                const backendBuildExists = (0, fs_1.existsSync)((0, path_1.join)(backendRoot, 'dist'));
                // Check package.json versions
                let frontendVersion = 'unknown';
                let backendVersion = 'unknown';
                try {
                    const frontendPkg = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(frontendRoot, 'package.json'), 'utf-8'));
                    frontendVersion = frontendPkg.version || 'unknown';
                }
                catch (_e) {
                    // Ignore
                }
                try {
                    const backendPkg = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(backendRoot, 'package.json'), 'utf-8'));
                    backendVersion = backendPkg.version || 'unknown';
                }
                catch (_e) {
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
                    const filePath = (0, path_1.join)(projectRoot, file);
                    if ((0, fs_1.existsSync)(filePath)) {
                        const stats = (0, fs_1.statSync)(filePath);
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
                    nodeVersion = (0, child_process_1.execSync)('node --version', { encoding: 'utf-8' }).trim();
                }
                catch (_e) {
                    // Ignore
                }
                // Check if Docker is available
                let dockerAvailable = false;
                let dockerVersion = 'unknown';
                try {
                    dockerVersion = (0, child_process_1.execSync)('docker --version', { encoding: 'utf-8' }).trim();
                    dockerAvailable = true;
                }
                catch (_e) {
                    // Docker not available
                }
                // Check if PM2 is available
                let pm2Available = false;
                let pm2Version = 'unknown';
                try {
                    pm2Version = (0, child_process_1.execSync)('pm2 --version', { encoding: 'utf-8' }).trim();
                    pm2Available = true;
                }
                catch (_e) {
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
            }
            catch (error) {
                console.error('Error getting deployment status:', error);
                throw new Error(`Failed to get deployment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Prepare deployment package
     * Path: POST /api/admin/deployment/prepare
     */
    prepareDeployment(config, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate configuration
                if (!config.domain || config.domain === 'yourdomain.com') {
                    throw new common_1.BadRequestException('Please provide a valid domain name');
                }
                if (!config.port || config.port < 1 || config.port > 65535) {
                    throw new common_1.BadRequestException('Please provide a valid port number');
                }
                if (!config.appName || config.appName.trim() === '') {
                    throw new common_1.BadRequestException('Please provide a valid app name');
                }
                if (!config.projectRoot || config.projectRoot.trim() === '') {
                    throw new common_1.BadRequestException('Please provide a valid project root path');
                }
                const projectRoot = process.cwd();
                const frontendRoot = (0, path_1.join)(projectRoot, 'frontend');
                // Check if build exists, if not return error (building should be done separately)
                const buildDir = (0, path_1.join)(frontendRoot, 'build');
                const nextDir = (0, path_1.join)(frontendRoot, '.next');
                if (!(0, fs_1.existsSync)(buildDir) && !(0, fs_1.existsSync)(nextDir)) {
                    throw new common_1.BadRequestException('Build directory not found. Please run "pnpm build" in the frontend directory first.');
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
                const ecosystemPath = (0, path_1.join)(frontendRoot, 'ecosystem.config.js');
                (0, fs_1.writeFileSync)(ecosystemPath, ecosystemConfig);
                // Create ZIP archive
                const zipPath = (0, path_1.join)(projectRoot, `openshutter-deployment-${config.domain}.zip`);
                const output = (0, fs_1.createWriteStream)(zipPath);
                const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
                return new Promise((resolve, reject) => {
                    output.on('close', () => {
                        // Read the zip file and send as response
                        const zipBuffer = (0, fs_1.readFileSync)(zipPath);
                        // Clean up temporary ecosystem.config.js
                        try {
                            (0, fs_1.unlinkSync)(ecosystemPath);
                        }
                        catch (e) {
                            console.warn('Could not delete temporary ecosystem.config.js:', e);
                        }
                        res.setHeader('Content-Type', 'application/zip');
                        res.setHeader('Content-Disposition', `attachment; filename="openshutter-deployment-${config.domain}.zip"`);
                        res.setHeader('Content-Length', zipBuffer.length.toString());
                        res.send(zipBuffer);
                        // Clean up zip file after sending
                        setTimeout(() => {
                            try {
                                (0, fs_1.unlinkSync)(zipPath);
                            }
                            catch (e) {
                                console.warn('Could not delete temporary zip file:', e);
                            }
                        }, 1000);
                        resolve();
                    });
                    archive.on('error', (err) => {
                        console.error('Error creating deployment package:', err);
                        reject(new common_1.BadRequestException('Failed to create deployment package'));
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
                        const filePath = (0, path_1.join)(frontendRoot, file.path);
                        if ((0, fs_1.existsSync)(filePath)) {
                            try {
                                const stat = (0, fs_1.statSync)(filePath);
                                if (stat.isDirectory()) {
                                    archive.directory(filePath, file.name);
                                }
                                else {
                                    archive.file(filePath, { name: file.name });
                                }
                            }
                            catch (error) {
                                console.error(`Error adding ${file.path} to archive:`, error);
                            }
                        }
                    });
                    archive.finalize();
                });
            }
            catch (error) {
                console.error('Deployment preparation error:', error);
                if (error instanceof common_1.BadRequestException) {
                    throw error;
                }
                throw new common_1.BadRequestException(`Failed to prepare deployment: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
};
exports.DeploymentController = DeploymentController;
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DeploymentController.prototype, "getDeploymentStatus", null);
__decorate([
    (0, common_1.Post)('prepare'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DeploymentController.prototype, "prepareDeployment", null);
exports.DeploymentController = DeploymentController = __decorate([
    (0, common_1.Controller)('admin/deployment'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard)
], DeploymentController);
