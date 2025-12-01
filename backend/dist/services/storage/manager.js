"use strict";
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
exports.storageManager = exports.StorageManager = void 0;
const config_1 = require("./config");
const types_1 = require("./types");
const local_1 = require("./providers/local");
const google_drive_1 = require("./providers/google-drive");
const aws_s3_1 = require("./providers/aws-s3");
const backblaze_1 = require("./providers/backblaze");
const wasabi_1 = require("./providers/wasabi");
class StorageManager {
    constructor() {
        this.serviceCache = new Map();
    }
    static getInstance() {
        if (!StorageManager.instance) {
            StorageManager.instance = new StorageManager();
        }
        return StorageManager.instance;
    }
    /**
     * Get storage service for a specific provider
     */
    getProvider(providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check cache first
            if (this.serviceCache.has(providerId)) {
                return this.serviceCache.get(providerId);
            }
            // Validate provider is enabled
            const isEnabled = yield config_1.storageConfigService.isProviderEnabled(providerId);
            if (!isEnabled) {
                throw new types_1.StorageConfigError(`Provider ${providerId} is not enabled`, providerId);
            }
            // Get provider configuration
            const config = yield config_1.storageConfigService.getConfig(providerId);
            // Create service instance
            const service = this.createService(providerId, config.config);
            // Cache the service
            this.serviceCache.set(providerId, service);
            return service;
        });
    }
    /**
     * Get all active storage providers
     */
    getActiveProviders() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield config_1.storageConfigService.getActiveProviders();
        });
    }
    /**
     * Validate a storage provider
     */
    validateProvider(providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const service = yield this.getProvider(providerId);
                return yield service.validateConnection();
            }
            catch (error) {
                console.error(`Failed to validate provider ${providerId}:`, error);
                return false;
            }
        });
    }
    /**
     * Create album folder
     */
    createAlbum(albumName, albumAlias, providerId, parentPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const service = yield this.getProvider(providerId);
                const albumPath = parentPath ? `${parentPath}/${albumAlias}` : albumAlias;
                return yield service.createFolder(albumAlias, parentPath);
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to create album ${albumName}`, providerId, 'createAlbum', error instanceof Error ? error : undefined);
            }
        });
    }
    /**
     * Delete album folder
     */
    deleteAlbum(albumPath, providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const service = yield this.getProvider(providerId);
                yield service.deleteFolder(albumPath);
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to delete album ${albumPath}`, providerId, 'deleteAlbum', error instanceof Error ? error : undefined);
            }
        });
    }
    /**
     * Get album information
     */
    getAlbumInfo(albumPath, providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const service = yield this.getProvider(providerId);
                return yield service.getFolderInfo(albumPath);
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to get album info for ${albumPath}`, providerId, 'getAlbumInfo', error instanceof Error ? error : undefined);
            }
        });
    }
    /**
     * Upload photo to album
     */
    uploadPhoto(file, filename, mimeType, albumPath, providerId, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const service = yield this.getProvider(providerId);
                return yield service.uploadFile(file, filename, mimeType, albumPath, metadata);
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to upload photo ${filename}`, providerId, 'uploadPhoto', error instanceof Error ? error : undefined);
            }
        });
    }
    /**
     * Upload buffer to storage
     */
    uploadBuffer(buffer, filePath, providerId, mimeType) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const service = yield this.getProvider(providerId);
                const filename = filePath.split('/').pop() || 'file';
                const folderPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : undefined;
                const detectedMimeType = mimeType || this.getMimeTypeFromFilename(filename);
                return yield service.uploadFile(buffer, filename, detectedMimeType, folderPath);
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to upload buffer to ${filePath}`, providerId, 'uploadBuffer', error instanceof Error ? error : undefined);
            }
        });
    }
    /**
     * Get MIME type from filename
     */
    getMimeTypeFromFilename(filename) {
        var _a;
        const extension = (_a = filename.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
        const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'svg': 'image/svg+xml',
            'pdf': 'application/pdf',
            'txt': 'text/plain'
        };
        return mimeTypes[extension || ''] || 'application/octet-stream';
    }
    /**
     * Delete photo
     */
    deletePhoto(photoPath, providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const service = yield this.getProvider(providerId);
                yield service.deleteFile(photoPath);
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to delete photo ${photoPath}`, providerId, 'deletePhoto', error instanceof Error ? error : undefined);
            }
        });
    }
    /**
     * Get photo information
     */
    getPhotoInfo(photoPath, providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const service = yield this.getProvider(providerId);
                return yield service.getFileInfo(photoPath);
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to get photo info for ${photoPath}`, providerId, 'getPhotoInfo', error instanceof Error ? error : undefined);
            }
        });
    }
    /**
     * List photos in album
     */
    listAlbumPhotos(albumPath, providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const service = yield this.getProvider(providerId);
                return yield service.listFiles(albumPath);
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to list photos in album ${albumPath}`, providerId, 'listAlbumPhotos', error instanceof Error ? error : undefined);
            }
        });
    }
    /**
     * Get photo URL
     */
    getPhotoUrl(photoPath, providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const service = yield this.getProvider(providerId);
                return service.getFileUrl(photoPath);
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to get photo URL for ${photoPath}`, providerId, 'getPhotoUrl', error instanceof Error ? error : undefined);
            }
        });
    }
    /**
     * Get album URL
     */
    getAlbumUrl(albumPath, providerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const service = yield this.getProvider(providerId);
                return service.getFolderUrl(albumPath);
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to get album URL for ${albumPath}`, providerId, 'getAlbumUrl', error instanceof Error ? error : undefined);
            }
        });
    }
    /**
     * Get photo buffer for serving
     */
    getPhotoBuffer(providerId, photoPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const service = yield this.getProvider(providerId);
                return yield service.getFileBuffer(photoPath);
            }
            catch (error) {
                console.error(`Failed to get photo buffer for ${photoPath}:`, error);
                return null;
            }
        });
    }
    /**
     * Create storage service instance based on provider type
     */
    createService(providerId, config) {
        switch (providerId) {
            case 'local':
                return new local_1.LocalStorageService(config);
            case 'google-drive':
                // Flatten the nested config structure for Google Drive
                const flattenedConfig = Object.assign(Object.assign({}, config), { 
                    // Extract nested config properties to top level
                    clientId: config.clientId, clientSecret: config.clientSecret, refreshToken: config.refreshToken, folderId: config.folderId, isEnabled: config.isEnabled });
                return new google_drive_1.GoogleDriveService(flattenedConfig);
            case 'aws-s3':
                // Flatten the nested config structure for AWS S3
                const flattenedS3Config = Object.assign(Object.assign({}, config), { 
                    // Extract nested config properties to top level
                    accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, region: config.region, bucketName: config.bucketName, isEnabled: config.isEnabled });
                return new aws_s3_1.AwsS3Service(flattenedS3Config);
            case 'backblaze':
                // Flatten the nested config structure for Backblaze
                const flattenedBackblazeConfig = Object.assign(Object.assign({}, config), { 
                    // Extract nested config properties to top level
                    applicationKeyId: config.applicationKeyId, applicationKey: config.applicationKey, bucketName: config.bucketName, region: config.region, isEnabled: config.isEnabled });
                return new backblaze_1.BackblazeService(flattenedBackblazeConfig);
            case 'wasabi':
                // Flatten the nested config structure for Wasabi
                const flattenedWasabiConfig = Object.assign(Object.assign({}, config), { 
                    // Extract nested config properties to top level
                    accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, bucketName: config.bucketName, region: config.region, endpoint: config.endpoint, isEnabled: config.isEnabled });
                return new wasabi_1.WasabiService(flattenedWasabiConfig);
            default:
                throw new types_1.StorageConfigError(`Unsupported storage provider: ${providerId}`, providerId);
        }
    }
    /**
     * Clear service cache
     */
    clearCache() {
        this.serviceCache.clear();
    }
    /**
     * Remove specific provider from cache
     */
    removeFromCache(providerId) {
        this.serviceCache.delete(providerId);
    }
}
exports.StorageManager = StorageManager;
// Export singleton instance
exports.storageManager = StorageManager.getInstance();
