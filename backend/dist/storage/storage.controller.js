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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageController = void 0;
const common_1 = require("@nestjs/common");
const manager_1 = require("../services/storage/manager");
const types_1 = require("../services/storage/types");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const path_2 = require("path");
let StorageController = class StorageController {
    /**
     * Serve files from storage
     * Path: GET /api/storage/serve/:provider/*
     */
    serveFile(provider, filePath, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const storageManager = manager_1.StorageManager.getInstance();
                const decodedPath = decodeURIComponent(filePath);
                // For local storage, serve files directly
                if (provider === 'local') {
                    const localService = yield storageManager.getProvider(provider);
                    const basePath = localService.basePath || process.env.LOCAL_STORAGE_PATH || './uploads';
                    // Replicate the getFullPath logic from LocalStorageService
                    const fullPath = (0, path_2.isAbsolute)(basePath)
                        ? (0, path_1.join)(basePath, decodedPath)
                        : (0, path_1.join)(process.cwd(), basePath, decodedPath);
                    try {
                        const fileBuffer = yield (0, promises_1.readFile)(fullPath);
                        // Determine content type from file extension
                        const ext = (_a = decodedPath.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
                        const contentTypeMap = {
                            'jpg': 'image/jpeg',
                            'jpeg': 'image/jpeg',
                            'png': 'image/png',
                            'gif': 'image/gif',
                            'webp': 'image/webp',
                            'ico': 'image/x-icon',
                            'svg': 'image/svg+xml',
                        };
                        const contentType = contentTypeMap[ext || ''] || 'application/octet-stream';
                        res.setHeader('Content-Type', contentType);
                        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
                        res.send(fileBuffer);
                    }
                    catch (error) {
                        console.error(`Failed to serve file ${fullPath}:`, error);
                        throw new common_1.NotFoundException(`File not found: ${decodedPath}`);
                    }
                }
                else if (['wasabi', 'aws-s3', 'backblaze'].includes(provider)) {
                    // For S3-compatible providers (Wasabi, AWS S3, Backblaze), use getFileBuffer
                    // Handle case where photos have 'aws-s3' but system uses 'wasabi' (S3-compatible)
                    let actualProvider = provider;
                    let storageService;
                    try {
                        storageService = yield storageManager.getProvider(provider);
                    }
                    catch (error) {
                        // If aws-s3 is not enabled but wasabi is, try wasabi as fallback (they're S3-compatible)
                        if (provider === 'aws-s3' && error instanceof types_1.StorageConfigError) {
                            console.log(`Provider ${provider} not enabled, trying wasabi as fallback...`);
                            try {
                                actualProvider = 'wasabi';
                                storageService = yield storageManager.getProvider('wasabi');
                                console.log(`Successfully using wasabi as fallback for ${provider}`);
                            }
                            catch (fallbackError) {
                                console.error(`Both ${provider} and wasabi are not enabled:`, fallbackError);
                                throw error; // Throw original error
                            }
                        }
                        else {
                            throw error;
                        }
                    }
                    try {
                        // Check if the service has getFileBuffer method
                        if (typeof storageService.getFileBuffer === 'function') {
                            const fileBuffer = yield storageService.getFileBuffer(decodedPath);
                            if (!fileBuffer) {
                                throw new common_1.NotFoundException(`File not found: ${decodedPath}`);
                            }
                            // Get file info to determine content type
                            let contentType = 'application/octet-stream';
                            try {
                                const fileInfo = yield storageService.getFileInfo(decodedPath);
                                contentType = fileInfo.mimeType || contentType;
                            }
                            catch (error) {
                                // Fallback to extension-based content type if getFileInfo fails
                                const ext = (_b = decodedPath.split('.').pop()) === null || _b === void 0 ? void 0 : _b.toLowerCase();
                                const contentTypeMap = {
                                    'jpg': 'image/jpeg',
                                    'jpeg': 'image/jpeg',
                                    'png': 'image/png',
                                    'gif': 'image/gif',
                                    'webp': 'image/webp',
                                    'ico': 'image/x-icon',
                                    'svg': 'image/svg+xml',
                                };
                                contentType = contentTypeMap[ext || ''] || contentType;
                            }
                            res.setHeader('Content-Type', contentType);
                            res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
                            res.send(fileBuffer);
                        }
                        else {
                            throw new common_1.NotFoundException(`Storage provider ${actualProvider} does not support file serving`);
                        }
                    }
                    catch (error) {
                        console.error(`Failed to serve file from ${actualProvider}:`, error);
                        if (error instanceof common_1.NotFoundException) {
                            throw error;
                        }
                        throw new common_1.NotFoundException(`File not found: ${decodedPath}`);
                    }
                }
                else {
                    // For other providers, redirect to their URL or handle differently
                    throw new common_1.NotFoundException(`Storage provider ${provider} file serving not implemented yet`);
                }
            }
            catch (error) {
                if (error instanceof common_1.NotFoundException) {
                    throw error;
                }
                console.error('Storage serve error:', error);
                throw new common_1.NotFoundException('File not found');
            }
        });
    }
};
exports.StorageController = StorageController;
__decorate([
    (0, common_1.Get)('serve/:provider/*path'),
    __param(0, (0, common_1.Param)('provider')),
    __param(1, (0, common_1.Param)('path')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "serveFile", null);
exports.StorageController = StorageController = __decorate([
    (0, common_1.Controller)('storage')
], StorageController);
