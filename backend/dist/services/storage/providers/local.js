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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorageService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const types_1 = require("../types");
class LocalStorageService {
    constructor(config) {
        this.providerId = 'local';
        this.config = config;
        this.basePath = config.basePath || process.env.LOCAL_STORAGE_PATH || './uploads';
    }
    getProviderId() {
        return this.providerId;
    }
    getConfig() {
        return this.config;
    }
    validateConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fullPath = path_1.default.isAbsolute(this.basePath)
                    ? this.basePath
                    : path_1.default.join(process.cwd(), this.basePath);
                yield promises_1.default.access(fullPath);
                return true;
            }
            catch (error) {
                console.error('Local storage validation failed:', error);
                return false;
            }
        });
    }
    createFolder(name, parentPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const folderPath = parentPath ? `${parentPath}/${name}` : name;
                const fullPath = this.getFullPath(folderPath);
                yield this.ensureDirectoryExists(fullPath);
                return {
                    provider: this.providerId,
                    folderId: folderPath,
                    name,
                    path: folderPath,
                    parentId: parentPath,
                    metadata: {}
                };
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to create folder ${name}`, this.providerId, 'createFolder', error instanceof Error ? error : undefined);
            }
        });
    }
    deleteFolder(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fullPath = this.getFullPath(folderPath);
                yield promises_1.default.rm(fullPath, { recursive: true, force: true });
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to delete folder ${folderPath}`, this.providerId, 'deleteFolder', error instanceof Error ? error : undefined);
            }
        });
    }
    getFolderInfo(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fullPath = this.getFullPath(folderPath);
                const stats = yield promises_1.default.stat(fullPath);
                const files = yield promises_1.default.readdir(fullPath);
                return {
                    provider: this.providerId,
                    folderId: folderPath,
                    name: path_1.default.basename(folderPath),
                    path: folderPath,
                    fileCount: files.length,
                    metadata: {},
                    createdAt: stats.birthtime,
                    updatedAt: stats.mtime
                };
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to get folder info for ${folderPath}`, this.providerId, 'getFolderInfo', error instanceof Error ? error : undefined);
            }
        });
    }
    listFolders(parentPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fullPath = this.getFullPath(parentPath || '');
                const items = yield promises_1.default.readdir(fullPath, { withFileTypes: true });
                const folders = items.filter(item => item.isDirectory());
                const folderInfos = [];
                for (const folder of folders) {
                    const folderPath = parentPath ? `${parentPath}/${folder.name}` : folder.name;
                    const folderInfo = yield this.getFolderInfo(folderPath);
                    folderInfos.push(folderInfo);
                }
                return folderInfos;
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to list folders in ${parentPath || 'root'}`, this.providerId, 'listFolders', error instanceof Error ? error : undefined);
            }
        });
    }
    uploadFile(file, filename, mimeType, folderPath, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const targetPath = folderPath ? `${folderPath}/${filename}` : filename;
                const fullPath = this.getFullPath(targetPath);
                // Ensure directory exists
                yield this.ensureDirectoryExists(path_1.default.dirname(fullPath));
                // Write file
                yield promises_1.default.writeFile(fullPath, file);
                // Generate URL
                const url = this.getFileUrl(targetPath);
                return {
                    provider: this.providerId,
                    fileId: targetPath,
                    url,
                    folderId: folderPath,
                    path: targetPath,
                    size: file.length,
                    mimeType,
                    metadata
                };
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to upload file ${filename}`, this.providerId, 'uploadFile', error instanceof Error ? error : undefined);
            }
        });
    }
    deleteFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fullPath = this.getFullPath(filePath);
                yield promises_1.default.unlink(fullPath);
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to delete file ${filePath}`, this.providerId, 'deleteFile', error instanceof Error ? error : undefined);
            }
        });
    }
    getFileInfo(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fullPath = this.getFullPath(filePath);
                const stats = yield promises_1.default.stat(fullPath);
                const url = this.getFileUrl(filePath);
                return {
                    provider: this.providerId,
                    fileId: filePath,
                    name: path_1.default.basename(filePath),
                    path: filePath,
                    size: stats.size,
                    mimeType: this.getMimeType(filePath),
                    url,
                    folderId: path_1.default.dirname(filePath),
                    metadata: {},
                    createdAt: stats.birthtime,
                    updatedAt: stats.mtime
                };
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to get file info for ${filePath}`, this.providerId, 'getFileInfo', error instanceof Error ? error : undefined);
            }
        });
    }
    listFiles(folderPath, pageSize) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fullPath = this.getFullPath(folderPath || '');
                const items = yield promises_1.default.readdir(fullPath, { withFileTypes: true });
                const files = items.filter(item => item.isFile());
                const fileInfos = [];
                const limit = pageSize || files.length;
                for (let i = 0; i < Math.min(files.length, limit); i++) {
                    const file = files[i];
                    const filePath = folderPath ? `${folderPath}/${file.name}` : file.name;
                    const fileInfo = yield this.getFileInfo(filePath);
                    fileInfos.push(fileInfo);
                }
                return fileInfos;
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to list files in ${folderPath || 'root'}`, this.providerId, 'listFiles', error instanceof Error ? error : undefined);
            }
        });
    }
    updateFileMetadata(filePath, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            // For local storage, metadata is typically stored in a separate file
            // This is a simplified implementation
            try {
                const metadataPath = this.getFullPath(`${filePath}.meta`);
                yield promises_1.default.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to update metadata for ${filePath}`, this.providerId, 'updateFileMetadata', error instanceof Error ? error : undefined);
            }
        });
    }
    fileExists(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fullPath = this.getFullPath(filePath);
                yield promises_1.default.access(fullPath);
                return true;
            }
            catch (_a) {
                return false;
            }
        });
    }
    folderExists(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fullPath = this.getFullPath(folderPath);
                const stats = yield promises_1.default.stat(fullPath);
                return stats.isDirectory();
            }
            catch (_a) {
                return false;
            }
        });
    }
    getFileUrl(filePath) {
        const encodedPath = filePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
        return `/api/storage/serve/local/${encodedPath}`;
    }
    getFolderUrl(folderPath) {
        const encodedPath = folderPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
        return `/api/storage/serve/local/${encodedPath}`;
    }
    getFileBuffer(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fullPath = this.getFullPath(filePath);
                console.log('Local storage get file buffer:', fullPath);
                const buffer = yield promises_1.default.readFile(fullPath);
                return buffer;
            }
            catch (error) {
                console.error(`Failed to read file buffer for ${filePath}:`, error);
                return null;
            }
        });
    }
    getFullPath(relativePath) {
        if (path_1.default.isAbsolute(this.basePath)) {
            return path_1.default.join(this.basePath, relativePath);
        }
        else {
            return path_1.default.join(process.cwd(), this.basePath, relativePath);
        }
    }
    ensureDirectoryExists(dirPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield promises_1.default.access(dirPath);
            }
            catch (_a) {
                yield promises_1.default.mkdir(dirPath, { recursive: true });
            }
        });
    }
    getMimeType(filePath) {
        const ext = path_1.default.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.json': 'application/json'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
}
exports.LocalStorageService = LocalStorageService;
