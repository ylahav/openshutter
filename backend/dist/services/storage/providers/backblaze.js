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
exports.BackblazeService = void 0;
const types_1 = require("../types");
const client_s3_1 = require("@aws-sdk/client-s3");
class BackblazeService {
    constructor(config) {
        this.providerId = 'backblaze';
        this.config = config;
        console.log('BackblazeService constructor - config:', JSON.stringify(config, null, 2));
        this.initializeS3Client();
    }
    initializeS3Client() {
        // Backblaze B2 uses S3-compatible API; allow custom endpoint override
        let endpoint = this.config.endpoint || `https://s3.${this.config.region}.backblazeb2.com`;
        if (endpoint && typeof endpoint === 'string') {
            const trimmed = endpoint.trim();
            // Prepend https:// if scheme is missing
            if (!/^https?:\/\//i.test(trimmed)) {
                endpoint = `https://${trimmed}`;
            }
            else {
                endpoint = trimmed;
            }
        }
        console.log('BackblazeService: Initializing S3 client with config:', {
            region: this.config.region,
            endpoint,
            applicationKeyId: this.config.applicationKeyId ? `${this.config.applicationKeyId.substring(0, 8)}...` : 'MISSING',
            applicationKey: this.config.applicationKey ? `${this.config.applicationKey.substring(0, 8)}...` : 'MISSING',
            bucketName: this.config.bucketName
        });
        this.s3Client = new client_s3_1.S3Client({
            region: this.config.region || 'us-west-2',
            endpoint,
            credentials: {
                accessKeyId: this.config.applicationKeyId,
                secretAccessKey: this.config.applicationKey
            },
            forcePathStyle: true
        });
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
                console.log('BackblazeService: Validating connection to bucket:', this.config.bucketName);
                // Test connection by listing objects in the bucket
                const command = new client_s3_1.ListObjectsV2Command({
                    Bucket: this.config.bucketName,
                    MaxKeys: 1
                });
                yield this.s3Client.send(command);
                console.log('BackblazeService: Connection validated successfully');
                return true;
            }
            catch (error) {
                console.error('BackblazeService: Connection validation failed:', error);
                return false;
            }
        });
    }
    createFolder(name, parentPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`BackblazeService: Creating folder '${name}' in path: ${parentPath || 'root'}`);
                // In S3-compatible storage, folders are logical constructs - we create an empty object with a trailing slash
                const folderKey = parentPath ? `${parentPath}/${name}/` : `${name}/`;
                const command = new client_s3_1.PutObjectCommand({
                    Bucket: this.config.bucketName,
                    Key: folderKey,
                    Body: '' // Empty content for folder marker
                });
                yield this.s3Client.send(command);
                console.log(`BackblazeService: Created folder '${name}' with key: ${folderKey}`);
                return {
                    provider: this.providerId,
                    folderId: folderKey,
                    name: name,
                    path: folderKey,
                    parentId: parentPath || undefined,
                    metadata: {}
                };
            }
            catch (error) {
                console.error(`BackblazeService: Failed to create folder '${name}':`, error);
                throw new types_1.StorageOperationError(`Failed to create folder ${name}`, this.providerId, 'createFolder', error instanceof Error ? error : undefined);
            }
        });
    }
    deleteFolder(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`BackblazeService: Deleting folder: ${folderPath}`);
                // List all objects in the folder
                const listCommand = new client_s3_1.ListObjectsV2Command({
                    Bucket: this.config.bucketName,
                    Prefix: folderPath
                });
                const listResult = yield this.s3Client.send(listCommand);
                if (listResult.Contents && listResult.Contents.length > 0) {
                    // Delete all objects in the folder
                    const deletePromises = listResult.Contents.map(obj => {
                        const deleteCommand = new client_s3_1.DeleteObjectCommand({
                            Bucket: this.config.bucketName,
                            Key: obj.Key
                        });
                        return this.s3Client.send(deleteCommand);
                    });
                    yield Promise.all(deletePromises);
                    console.log(`BackblazeService: Successfully deleted folder: ${folderPath}`);
                }
            }
            catch (error) {
                console.error(`BackblazeService: Failed to delete folder ${folderPath}:`, error);
                throw new types_1.StorageOperationError(`Failed to delete folder ${folderPath}`, this.providerId, 'deleteFolder', error instanceof Error ? error : undefined);
            }
        });
    }
    getFolderInfo(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // List objects in the folder to get info
                const command = new client_s3_1.ListObjectsV2Command({
                    Bucket: this.config.bucketName,
                    Prefix: folderPath,
                    MaxKeys: 1
                });
                const response = yield this.s3Client.send(command);
                return {
                    provider: this.providerId,
                    folderId: folderPath,
                    name: folderPath.split('/').pop() || folderPath,
                    path: folderPath,
                    parentId: folderPath.split('/').slice(0, -1).join('/') || undefined,
                    metadata: {},
                    fileCount: response.KeyCount || 0,
                    createdAt: new Date(),
                    updatedAt: new Date()
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
                const command = new client_s3_1.ListObjectsV2Command({
                    Bucket: this.config.bucketName,
                    Prefix: parentPath,
                    Delimiter: '/'
                });
                const response = yield this.s3Client.send(command);
                const folders = [];
                if (response.CommonPrefixes) {
                    for (const prefix of response.CommonPrefixes) {
                        if (prefix.Prefix) {
                            const folderName = prefix.Prefix.replace(parentPath || '', '').replace(/\/$/, '');
                            folders.push({
                                provider: this.providerId,
                                folderId: prefix.Prefix,
                                name: folderName,
                                path: prefix.Prefix,
                                parentId: parentPath || undefined,
                                metadata: {},
                                fileCount: 0,
                                createdAt: new Date(),
                                updatedAt: new Date()
                            });
                        }
                    }
                }
                return folders;
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to list folders in ${parentPath || 'root'}`, this.providerId, 'listFolders', error instanceof Error ? error : undefined);
            }
        });
    }
    uploadFile(file, filename, mimeType, folderPath, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`BackblazeService: Uploading file '${filename}' to path: ${folderPath || 'root'}`);
                const key = folderPath ? `${folderPath}/${filename}` : filename;
                const command = new client_s3_1.PutObjectCommand({
                    Bucket: this.config.bucketName,
                    Key: key,
                    Body: file,
                    ContentType: mimeType,
                    Metadata: metadata || {}
                });
                yield this.s3Client.send(command);
                console.log(`BackblazeService: Uploaded file '${filename}' with key: ${key}`);
                return {
                    provider: this.providerId,
                    fileId: key,
                    url: `/api/storage/serve/backblaze/${encodeURIComponent(key)}`,
                    folderId: folderPath || '',
                    path: key,
                    size: file.length,
                    mimeType: mimeType,
                    metadata: metadata || {}
                };
            }
            catch (error) {
                console.error(`BackblazeService: Failed to upload file '${filename}':`, error);
                throw new types_1.StorageOperationError(`Failed to upload file ${filename}`, this.providerId, 'uploadFile', error instanceof Error ? error : undefined);
            }
        });
    }
    deleteFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`BackblazeService: Deleting file: ${filePath}`);
                const command = new client_s3_1.DeleteObjectCommand({
                    Bucket: this.config.bucketName,
                    Key: filePath
                });
                yield this.s3Client.send(command);
                console.log(`BackblazeService: Successfully deleted file: ${filePath}`);
            }
            catch (error) {
                console.error(`BackblazeService: Failed to delete file ${filePath}:`, error);
                throw new types_1.StorageOperationError(`Failed to delete file ${filePath}`, this.providerId, 'deleteFile', error instanceof Error ? error : undefined);
            }
        });
    }
    getFileInfo(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const command = new client_s3_1.HeadObjectCommand({
                    Bucket: this.config.bucketName,
                    Key: filePath
                });
                const response = yield this.s3Client.send(command);
                return {
                    provider: this.providerId,
                    fileId: filePath,
                    name: filePath.split('/').pop() || filePath,
                    path: filePath,
                    size: parseInt(((_a = response.ContentLength) === null || _a === void 0 ? void 0 : _a.toString()) || '0'),
                    mimeType: response.ContentType || 'application/octet-stream',
                    url: this.getFileUrl(filePath),
                    folderId: filePath.split('/').slice(0, -1).join('/') || undefined,
                    metadata: response.Metadata || {},
                    createdAt: response.LastModified || new Date(),
                    updatedAt: response.LastModified || new Date()
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
                console.log(`BackblazeService: Listing files in folder: ${folderPath || 'root'}`);
                const command = new client_s3_1.ListObjectsV2Command({
                    Bucket: this.config.bucketName,
                    Prefix: folderPath,
                    MaxKeys: pageSize || 1000
                });
                const response = yield this.s3Client.send(command);
                const files = [];
                if (response.Contents) {
                    for (const obj of response.Contents) {
                        if (obj.Key && !obj.Key.endsWith('/')) { // Skip folder markers
                            files.push({
                                provider: this.providerId,
                                fileId: obj.Key,
                                name: obj.Key.split('/').pop() || obj.Key,
                                path: obj.Key,
                                size: obj.Size || 0,
                                mimeType: 'application/octet-stream', // S3 doesn't store MIME type in listing
                                url: this.getFileUrl(obj.Key),
                                folderId: obj.Key.split('/').slice(0, -1).join('/') || undefined,
                                metadata: {},
                                createdAt: obj.LastModified || new Date(),
                                updatedAt: obj.LastModified || new Date()
                            });
                        }
                    }
                }
                console.log(`BackblazeService: Found ${files.length} files`);
                return files;
            }
            catch (error) {
                console.error(`BackblazeService: Failed to list files in ${folderPath || 'root'}:`, error);
                throw new types_1.StorageOperationError(`Failed to list files in ${folderPath || 'root'}`, this.providerId, 'listFiles', error instanceof Error ? error : undefined);
            }
        });
    }
    updateFileMetadata(filePath, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get the current object
                const headCommand = new client_s3_1.HeadObjectCommand({
                    Bucket: this.config.bucketName,
                    Key: filePath
                });
                const headResponse = yield this.s3Client.send(headCommand);
                // Copy the object with new metadata
                const copyCommand = new client_s3_1.PutObjectCommand({
                    Bucket: this.config.bucketName,
                    Key: filePath,
                    Body: '', // We need to get the actual content
                    ContentType: headResponse.ContentType,
                    Metadata: metadata
                });
                yield this.s3Client.send(copyCommand);
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to update metadata for ${filePath}`, this.providerId, 'updateFileMetadata', error instanceof Error ? error : undefined);
            }
        });
    }
    fileExists(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const command = new client_s3_1.HeadObjectCommand({
                    Bucket: this.config.bucketName,
                    Key: filePath
                });
                yield this.s3Client.send(command);
                return true;
            }
            catch (error) {
                return false;
            }
        });
    }
    folderExists(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const command = new client_s3_1.ListObjectsV2Command({
                    Bucket: this.config.bucketName,
                    Prefix: folderPath,
                    MaxKeys: 1
                });
                const response = yield this.s3Client.send(command);
                return response.Contents ? response.Contents.length > 0 : false;
            }
            catch (error) {
                return false;
            }
        });
    }
    getFileUrl(filePath) {
        return `/api/storage/serve/backblaze/${encodeURIComponent(filePath)}`;
    }
    getFolderUrl(folderPath) {
        return `/api/storage/serve/backblaze/${encodeURIComponent(folderPath)}`;
    }
    getFileBuffer(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`BackblazeService: Getting file buffer for path: ${filePath}`);
                const command = new client_s3_1.GetObjectCommand({
                    Bucket: this.config.bucketName,
                    Key: filePath
                });
                const response = yield this.s3Client.send(command);
                if (!response.Body) {
                    console.log(`BackblazeService: No body in response for file: ${filePath}`);
                    return null;
                }
                // Convert the readable stream to buffer
                const chunks = [];
                const reader = response.Body.transformToWebStream().getReader();
                while (true) {
                    const { done, value } = yield reader.read();
                    if (done)
                        break;
                    chunks.push(value);
                }
                const buffer = Buffer.concat(chunks);
                console.log(`BackblazeService: Successfully downloaded file, size: ${buffer.length} bytes`);
                return buffer;
            }
            catch (error) {
                console.error(`BackblazeService: Failed to get file buffer for ${filePath}:`, error);
                return null;
            }
        });
    }
}
exports.BackblazeService = BackblazeService;
