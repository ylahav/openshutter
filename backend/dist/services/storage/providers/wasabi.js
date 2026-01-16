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
exports.WasabiService = void 0;
const types_1 = require("../types");
const client_s3_1 = require("@aws-sdk/client-s3");
class WasabiService {
    constructor(config) {
        this.providerId = 'wasabi';
        this.config = config;
        console.log('WasabiService constructor - config:', JSON.stringify(config, null, 2));
        // Don't initialize S3Client here - wait until we have validated config
        // This prevents issues with undefined values
    }
    initializeS3Client() {
        var _a, _b, _c;
        // Validate that we have the required config before initializing
        // Check for both undefined/null and empty strings
        const endpoint = (_a = this.config.endpoint) === null || _a === void 0 ? void 0 : _a.trim();
        const accessKeyId = (_b = this.config.accessKeyId) === null || _b === void 0 ? void 0 : _b.trim();
        const secretAccessKey = (_c = this.config.secretAccessKey) === null || _c === void 0 ? void 0 : _c.trim();
        if (!endpoint || endpoint === '') {
            throw new types_1.StorageConnectionError('Missing endpoint. Cannot initialize S3 client without endpoint. Please provide a Wasabi endpoint URL (e.g., https://s3.wasabisys.com).', this.providerId, new Error('Missing endpoint'));
        }
        if (!accessKeyId || accessKeyId === '' || !secretAccessKey || secretAccessKey === '') {
            throw new types_1.StorageConnectionError('Missing credentials. Cannot initialize S3 client without access credentials. Please provide both Access Key ID and Secret Access Key.', this.providerId, new Error('Missing credentials'));
        }
        // Normalize endpoint - remove trailing slash if present
        let normalizedEndpoint = endpoint.replace(/\/$/, '');
        // Auto-add https:// if protocol is missing
        if (!normalizedEndpoint.startsWith('http://') && !normalizedEndpoint.startsWith('https://')) {
            console.log(`WasabiService: Endpoint missing protocol, adding https://: ${normalizedEndpoint}`);
            normalizedEndpoint = `https://${normalizedEndpoint}`;
        }
        console.log('WasabiService: Initializing S3Client');
        console.log('WasabiService: Endpoint:', normalizedEndpoint);
        console.log('WasabiService: Region:', this.config.region || 'us-east-1');
        console.log('WasabiService: Bucket:', this.config.bucketName);
        console.log('WasabiService: AccessKeyId length:', accessKeyId.length);
        console.log('WasabiService: SecretAccessKey length:', secretAccessKey.length);
        // Wasabi uses S3-compatible API with custom endpoint
        try {
            this.s3Client = new client_s3_1.S3Client({
                region: this.config.region || 'us-east-1',
                endpoint: normalizedEndpoint,
                credentials: {
                    accessKeyId: accessKeyId,
                    secretAccessKey: secretAccessKey
                },
                forcePathStyle: true // Wasabi requires path-style URLs
            });
            console.log('WasabiService: S3Client initialized successfully');
        }
        catch (error) {
            console.error('WasabiService: Failed to create S3Client:', error);
            throw new types_1.StorageConnectionError(`Failed to initialize S3 client: ${error.message || 'Unknown error'}`, this.providerId, error instanceof Error ? error : undefined);
        }
    }
    getProviderId() {
        return this.providerId;
    }
    getConfig() {
        return this.config;
    }
    /**
     * Ensure S3Client is initialized before use
     * This is called by methods that need the client but might be called before validateConnection
     */
    ensureS3ClientInitialized() {
        if (!this.s3Client) {
            this.initializeS3Client();
        }
    }
    validateConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                console.log('WasabiService: Validating connection to bucket:', this.config.bucketName);
                console.log('WasabiService: Full config keys:', Object.keys(this.config));
                console.log('WasabiService: Config values:', {
                    hasAccessKeyId: !!this.config.accessKeyId,
                    hasSecretAccessKey: !!this.config.secretAccessKey,
                    bucketName: this.config.bucketName,
                    endpoint: this.config.endpoint,
                    region: this.config.region
                });
                // Validate required configuration (check for both undefined/null and empty strings)
                const accessKeyId = (_a = this.config.accessKeyId) === null || _a === void 0 ? void 0 : _a.trim();
                const secretAccessKey = (_b = this.config.secretAccessKey) === null || _b === void 0 ? void 0 : _b.trim();
                const bucketName = (_c = this.config.bucketName) === null || _c === void 0 ? void 0 : _c.trim();
                const endpoint = (_d = this.config.endpoint) === null || _d === void 0 ? void 0 : _d.trim();
                if (!accessKeyId || accessKeyId === '' || !secretAccessKey || secretAccessKey === '') {
                    throw new types_1.StorageConnectionError('Missing access credentials. Please provide Access Key ID and Secret Access Key.', this.providerId, new Error('Missing credentials'));
                }
                if (!bucketName || bucketName === '') {
                    throw new types_1.StorageConnectionError('Missing bucket name. Please provide a bucket name.', this.providerId, new Error('Missing bucket name'));
                }
                if (!endpoint || endpoint === '') {
                    throw new types_1.StorageConnectionError('Missing endpoint. Please provide a Wasabi endpoint URL (e.g., https://s3.wasabisys.com).', this.providerId, new Error('Missing endpoint'));
                }
                // Initialize or re-initialize S3Client with validated config
                // This ensures the client is properly configured even if constructor was called with incomplete config
                try {
                    this.initializeS3Client();
                }
                catch (initError) {
                    console.error('WasabiService: Failed to initialize S3Client:', initError);
                    if (initError instanceof types_1.StorageConnectionError) {
                        throw initError;
                    }
                    throw new types_1.StorageConnectionError(`Failed to initialize S3 client: ${initError.message || 'Unknown error'}`, this.providerId, initError instanceof Error ? initError : undefined);
                }
                // Test connection by listing objects in the bucket
                const command = new client_s3_1.ListObjectsV2Command({
                    Bucket: bucketName,
                    MaxKeys: 1
                });
                console.log('WasabiService: Sending ListObjectsV2Command to bucket:', bucketName);
                const response = yield this.s3Client.send(command);
                console.log('WasabiService: ListObjectsV2Command response:', {
                    hasContents: !!response.Contents,
                    keyCount: response.KeyCount,
                    isTruncated: response.IsTruncated
                });
                console.log('WasabiService: Connection validated successfully');
                return true;
            }
            catch (error) {
                console.error('WasabiService: Connection validation failed:', error);
                // If it's already a StorageConnectionError, re-throw it
                if (error instanceof types_1.StorageConnectionError) {
                    throw error;
                }
                // Build detailed error information
                let errorMessage = 'Connection validation failed';
                let errorCode;
                let errorDetails = {};
                let suggestions = [];
                // Extract AWS SDK error information
                if (error === null || error === void 0 ? void 0 : error.name) {
                    errorCode = error.name;
                    errorDetails.name = error.name;
                }
                if (error === null || error === void 0 ? void 0 : error.$metadata) {
                    errorDetails.metadata = error.$metadata;
                    if (error.$metadata.httpStatusCode) {
                        errorCode = error.$metadata.httpStatusCode.toString();
                    }
                }
                if (error === null || error === void 0 ? void 0 : error.message) {
                    errorMessage = error.message;
                    errorDetails.message = error.message;
                }
                // Check for specific error types
                if ((error === null || error === void 0 ? void 0 : error.name) === 'NoSuchBucket' || errorMessage.includes('NoSuchBucket')) {
                    errorMessage = `Bucket "${this.config.bucketName}" does not exist or is not accessible.`;
                    suggestions.push('Verify that the bucket name is correct.');
                    suggestions.push('Check that the bucket exists in your Wasabi account.');
                    suggestions.push('Ensure the access key has permissions to access this bucket.');
                }
                else if ((error === null || error === void 0 ? void 0 : error.name) === 'InvalidAccessKeyId' || errorMessage.includes('InvalidAccessKeyId')) {
                    errorMessage = 'Invalid Access Key ID. Please check your credentials.';
                    suggestions.push('Verify that the Access Key ID is correct.');
                    suggestions.push('Check that the access key is active in your Wasabi account.');
                }
                else if ((error === null || error === void 0 ? void 0 : error.name) === 'SignatureDoesNotMatch' || errorMessage.includes('SignatureDoesNotMatch')) {
                    errorMessage = 'Invalid Secret Access Key. Please check your credentials.';
                    suggestions.push('Verify that the Secret Access Key is correct.');
                    suggestions.push('Ensure there are no extra spaces or characters in the secret key.');
                }
                else if ((error === null || error === void 0 ? void 0 : error.name) === 'Forbidden' || (error === null || error === void 0 ? void 0 : error.name) === 'AccessDenied' || errorMessage.includes('Forbidden') || errorMessage.includes('AccessDenied')) {
                    errorMessage = 'Access denied. The credentials do not have permission to access this bucket.';
                    suggestions.push('Verify that the access key has the necessary permissions.');
                    suggestions.push('Check the bucket policy and IAM permissions in Wasabi.');
                }
                else if ((error === null || error === void 0 ? void 0 : error.code) === 'ENOTFOUND' || (error === null || error === void 0 ? void 0 : error.code) === 'ECONNREFUSED' || (error === null || error === void 0 ? void 0 : error.code) === 'ETIMEDOUT') {
                    errorMessage = `Network error: Cannot connect to Wasabi endpoint "${this.config.endpoint}".`;
                    suggestions.push('Verify that the endpoint URL is correct (e.g., https://s3.wasabisys.com).');
                    suggestions.push('Check your network connection and firewall settings.');
                    suggestions.push('Ensure the endpoint matches your Wasabi region.');
                }
                else if (errorMessage.includes('endpoint')) {
                    suggestions.push('Verify that the endpoint URL is correct and includes the protocol (https://).');
                    suggestions.push('Check that the endpoint matches your Wasabi region.');
                }
                // Add general suggestions if none were added
                if (suggestions.length === 0) {
                    suggestions.push('Verify that all configuration fields are correct.');
                    suggestions.push('Check that the bucket exists and is accessible.');
                    suggestions.push('Ensure the access key has the necessary permissions.');
                }
                // Create detailed error
                const detailedError = new types_1.StorageConnectionError(errorMessage, this.providerId, error);
                detailedError.code = errorCode;
                detailedError.details = Object.assign(Object.assign({}, errorDetails), { bucketName: this.config.bucketName, endpoint: this.config.endpoint, region: this.config.region, hasAccessKey: !!this.config.accessKeyId, hasSecretKey: !!this.config.secretAccessKey, suggestions });
                throw detailedError;
            }
        });
    }
    createFolder(name, parentPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Ensure S3Client is initialized before use
                this.ensureS3ClientInitialized();
                console.log(`WasabiService: Creating folder '${name}' in path: ${parentPath || 'root'}`);
                // In S3-compatible storage, folders are logical constructs - we create an empty object with a trailing slash
                const folderKey = parentPath ? `${parentPath}/${name}/` : `${name}/`;
                const command = new client_s3_1.PutObjectCommand({
                    Bucket: this.config.bucketName,
                    Key: folderKey,
                    Body: '' // Empty content for folder marker
                });
                yield this.s3Client.send(command);
                console.log(`WasabiService: Created folder '${name}' with key: ${folderKey}`);
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
                console.error(`WasabiService: Failed to create folder '${name}':`, error);
                throw new types_1.StorageOperationError(`Failed to create folder ${name}`, this.providerId, 'createFolder', error instanceof Error ? error : undefined);
            }
        });
    }
    deleteFolder(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Ensure S3Client is initialized before use
                this.ensureS3ClientInitialized();
                console.log(`WasabiService: Deleting folder: ${folderPath}`);
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
                    console.log(`WasabiService: Successfully deleted folder: ${folderPath}`);
                }
            }
            catch (error) {
                console.error(`WasabiService: Failed to delete folder ${folderPath}:`, error);
                throw new types_1.StorageOperationError(`Failed to delete folder ${folderPath}`, this.providerId, 'deleteFolder', error instanceof Error ? error : undefined);
            }
        });
    }
    getFolderInfo(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Ensure S3Client is initialized before use
                this.ensureS3ClientInitialized();
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
                // Ensure S3Client is initialized before use
                this.ensureS3ClientInitialized();
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
                // If it's a connection/auth error, throw StorageConnectionError for better error handling
                if ((error === null || error === void 0 ? void 0 : error.name) === 'InvalidAccessKeyId' || (error === null || error === void 0 ? void 0 : error.name) === 'SignatureDoesNotMatch' ||
                    (error === null || error === void 0 ? void 0 : error.name) === 'NoSuchBucket' || (error === null || error === void 0 ? void 0 : error.name) === 'Forbidden' || (error === null || error === void 0 ? void 0 : error.name) === 'AccessDenied') {
                    throw new types_1.StorageConnectionError(`Failed to list folders: ${error.message || 'Connection error'}`, this.providerId, error instanceof Error ? error : undefined);
                }
                throw new types_1.StorageOperationError(`Failed to list folders in ${parentPath || 'root'}`, this.providerId, 'listFolders', error instanceof Error ? error : undefined);
            }
        });
    }
    uploadFile(file, filename, mimeType, folderPath, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Ensure S3Client is initialized before use
                this.ensureS3ClientInitialized();
                console.log(`WasabiService: Uploading file '${filename}' to path: ${folderPath || 'root'}`);
                const key = folderPath ? `${folderPath}/${filename}` : filename;
                const command = new client_s3_1.PutObjectCommand({
                    Bucket: this.config.bucketName,
                    Key: key,
                    Body: file,
                    ContentType: mimeType,
                    Metadata: metadata || {}
                });
                yield this.s3Client.send(command);
                console.log(`WasabiService: Uploaded file '${filename}' with key: ${key}`);
                return {
                    provider: this.providerId,
                    fileId: key,
                    url: `/api/storage/serve/wasabi/${encodeURIComponent(key)}`,
                    folderId: folderPath || '',
                    path: key,
                    size: file.length,
                    mimeType: mimeType,
                    metadata: metadata || {}
                };
            }
            catch (error) {
                console.error(`WasabiService: Failed to upload file '${filename}':`, error);
                throw new types_1.StorageOperationError(`Failed to upload file ${filename}`, this.providerId, 'uploadFile', error instanceof Error ? error : undefined);
            }
        });
    }
    deleteFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Ensure S3Client is initialized before use
                this.ensureS3ClientInitialized();
                console.log(`WasabiService: Deleting file: ${filePath}`);
                const command = new client_s3_1.DeleteObjectCommand({
                    Bucket: this.config.bucketName,
                    Key: filePath
                });
                yield this.s3Client.send(command);
                console.log(`WasabiService: Successfully deleted file: ${filePath}`);
            }
            catch (error) {
                console.error(`WasabiService: Failed to delete file ${filePath}:`, error);
                throw new types_1.StorageOperationError(`Failed to delete file ${filePath}`, this.providerId, 'deleteFile', error instanceof Error ? error : undefined);
            }
        });
    }
    getFileInfo(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Ensure S3Client is initialized before use
                this.ensureS3ClientInitialized();
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
                // Ensure S3Client is initialized before use
                this.ensureS3ClientInitialized();
                console.log(`WasabiService: Listing files in folder: ${folderPath || 'root'}`);
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
                console.log(`WasabiService: Found ${files.length} files`);
                return files;
            }
            catch (error) {
                console.error(`WasabiService: Failed to list files in ${folderPath || 'root'}:`, error);
                throw new types_1.StorageOperationError(`Failed to list files in ${folderPath || 'root'}`, this.providerId, 'listFiles', error instanceof Error ? error : undefined);
            }
        });
    }
    updateFileMetadata(filePath, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Ensure S3Client is initialized before use
                this.ensureS3ClientInitialized();
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
                // Ensure S3Client is initialized before use
                this.ensureS3ClientInitialized();
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
                // Ensure S3Client is initialized before use
                this.ensureS3ClientInitialized();
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
        return `/api/storage/serve/wasabi/${encodeURIComponent(filePath)}`;
    }
    getFolderUrl(folderPath) {
        return `/api/storage/serve/wasabi/${encodeURIComponent(folderPath)}`;
    }
    getFileBuffer(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Ensure S3Client is initialized before use
                this.ensureS3ClientInitialized();
                console.log(`WasabiService: Getting file buffer for path: ${filePath}`);
                const command = new client_s3_1.GetObjectCommand({
                    Bucket: this.config.bucketName,
                    Key: filePath
                });
                const response = yield this.s3Client.send(command);
                if (!response.Body) {
                    console.log(`WasabiService: No body in response for file: ${filePath}`);
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
                console.log(`WasabiService: Successfully downloaded file, size: ${buffer.length} bytes`);
                return buffer;
            }
            catch (error) {
                console.error(`WasabiService: Failed to get file buffer for ${filePath}:`, error);
                return null;
            }
        });
    }
}
exports.WasabiService = WasabiService;
