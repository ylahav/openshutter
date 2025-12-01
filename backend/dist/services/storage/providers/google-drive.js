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
exports.GoogleDriveService = void 0;
const googleapis_1 = require("googleapis");
const types_1 = require("../types");
class GoogleDriveService {
    constructor(config) {
        this.providerId = 'google-drive';
        this.config = config;
        this.initializeAuth();
    }
    getProviderId() {
        return this.providerId;
    }
    getConfig() {
        return this.config;
    }
    initializeAuth() {
        this.auth = new googleapis_1.google.auth.OAuth2(this.config.clientId, this.config.clientSecret);
        if (this.config.accessToken && this.config.tokenExpiry && new Date() < this.config.tokenExpiry) {
            this.auth.setCredentials({ access_token: this.config.accessToken });
        }
        else {
            this.auth.setCredentials({ refresh_token: this.config.refreshToken });
        }
        this.drive = googleapis_1.google.drive({ version: 'v3', auth: this.auth });
    }
    refreshAccessToken() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.config.refreshToken) {
                    throw new Error('Refresh token is missing');
                }
                const { credentials } = yield this.auth.refreshAccessToken();
                this.config.accessToken = credentials.access_token;
                this.config.tokenExpiry = credentials.expiry_date ? new Date(credentials.expiry_date) : undefined;
                // Update the auth instance
                this.auth.setCredentials(credentials);
            }
            catch (error) {
                console.error('Failed to refresh Google Drive access token:', error);
                throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    validateConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Ensure we have a valid access token
                if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
                    yield this.refreshAccessToken();
                }
                // Test connection by getting user info (more reliable than folder access)
                yield this.drive.about.get({ fields: 'user' });
                return true;
            }
            catch (error) {
                console.error('Google Drive connection validation failed:', error);
                return false;
            }
        });
    }
    createFolder(name, parentPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Ensure we have a valid access token
                if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
                    yield this.refreshAccessToken();
                }
                // Resolve parentPath to folder ID if it's a path, otherwise use as folder ID
                let parentFolderId = this.config.folderId;
                if (parentPath) {
                    if (parentPath.includes('/') || parentPath !== this.config.folderId) {
                        // It's a path, need to resolve it
                        const resolvedFolderId = yield this.getFolderIdByPath(parentPath);
                        if (resolvedFolderId) {
                            parentFolderId = resolvedFolderId;
                        }
                        else {
                            parentFolderId = this.config.folderId;
                        }
                    }
                    else {
                        // It's already a folder ID
                        parentFolderId = parentPath;
                    }
                }
                // Check if folder already exists
                const existingResponse = yield this.drive.files.list({
                    q: `'${parentFolderId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                    fields: 'files(id,name)',
                    pageSize: 1
                });
                if (existingResponse.data.files && existingResponse.data.files.length > 0) {
                    // Folder already exists, return existing folder info
                    const existingFolder = existingResponse.data.files[0];
                    return {
                        provider: this.providerId,
                        folderId: existingFolder.id,
                        name: existingFolder.name,
                        path: `${parentPath || ''}/${name}`.replace(/^\//, ''),
                        parentId: parentFolderId,
                        metadata: {}
                    };
                }
                // Create new folder
                const folderMetadata = {
                    name: name,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentFolderId]
                };
                const response = yield this.drive.files.create({
                    requestBody: folderMetadata,
                    fields: 'id,name,webViewLink'
                });
                return {
                    provider: this.providerId,
                    folderId: response.data.id,
                    name: response.data.name,
                    path: `${parentPath || ''}/${name}`.replace(/^\//, ''),
                    parentId: parentFolderId,
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
                // Ensure we have a valid access token
                if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
                    yield this.refreshAccessToken();
                }
                // For Google Drive, we need to get the folder ID first
                const folderId = yield this.getFolderIdByPath(folderPath);
                if (folderId) {
                    yield this.drive.files.delete({ fileId: folderId });
                }
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to delete folder ${folderPath}`, this.providerId, 'deleteFolder', error instanceof Error ? error : undefined);
            }
        });
    }
    getFolderInfo(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Ensure we have a valid access token
                if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
                    yield this.refreshAccessToken();
                }
                const folderId = yield this.getFolderIdByPath(folderPath);
                if (!folderId) {
                    throw new Error('Folder not found');
                }
                const response = yield this.drive.files.get({
                    fileId: folderId,
                    fields: 'id,name,createdTime,modifiedTime,size'
                });
                // Get file count
                const filesResponse = yield this.drive.files.list({
                    q: `'${folderId}' in parents and trashed=false`,
                    fields: 'files(id)',
                    pageSize: 1000
                });
                return {
                    provider: this.providerId,
                    folderId: response.data.id,
                    name: response.data.name,
                    path: folderPath,
                    fileCount: ((_a = filesResponse.data.files) === null || _a === void 0 ? void 0 : _a.length) || 0,
                    metadata: {},
                    createdAt: new Date(response.data.createdTime),
                    updatedAt: new Date(response.data.modifiedTime)
                };
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to get folder info for ${folderPath}`, this.providerId, 'getFolderInfo', error instanceof Error ? error : undefined);
            }
        });
    }
    listFolders(parentPath) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Ensure we have a valid access token
                if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
                    yield this.refreshAccessToken();
                }
                const parentFolderId = parentPath || this.config.folderId;
                const response = yield this.drive.files.list({
                    q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                    fields: 'files(id,name,createdTime,modifiedTime)',
                    pageSize: 1000
                });
                return ((_a = response.data.files) === null || _a === void 0 ? void 0 : _a.map((file) => ({
                    provider: this.providerId,
                    folderId: file.id,
                    name: file.name,
                    path: `${parentPath || ''}/${file.name}`.replace(/^\//, ''),
                    parentId: parentFolderId,
                    fileCount: 0, // Would need additional API call to get this
                    metadata: {},
                    createdAt: new Date(file.createdTime),
                    updatedAt: new Date(file.modifiedTime)
                }))) || [];
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to list folders in ${parentPath || 'root'}`, this.providerId, 'listFolders', error instanceof Error ? error : undefined);
            }
        });
    }
    getFolderIdByPath(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // If folderPath is empty or just whitespace, return the root folder ID
                if (!folderPath || folderPath.trim() === '') {
                    return this.config.folderId;
                }
                const pathParts = folderPath.split('/').filter(Boolean);
                let currentFolderId = this.config.folderId;
                for (const folderName of pathParts) {
                    const query = `'${currentFolderId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
                    const response = yield this.drive.files.list({
                        q: query,
                        fields: 'files(id,name)',
                        pageSize: 1
                    });
                    if (response.data.files && response.data.files.length > 0) {
                        currentFolderId = response.data.files[0].id;
                    }
                    else {
                        return null;
                    }
                }
                return currentFolderId;
            }
            catch (error) {
                console.error('GoogleDriveService: Failed to get folder ID by path:', error);
                return null;
            }
        });
    }
    uploadFile(file, filename, mimeType, folderPath, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Ensure we have a valid access token
                if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
                    yield this.refreshAccessToken();
                }
                // Resolve folder path to folder ID if provided
                let parentFolderId = this.config.folderId;
                if (folderPath) {
                    const resolvedFolderId = yield this.getFolderIdByPath(folderPath);
                    if (resolvedFolderId) {
                        parentFolderId = resolvedFolderId;
                    }
                }
                const fileMetadata = Object.assign({ name: filename, parents: [parentFolderId] }, metadata);
                // Convert Buffer to readable stream for Google Drive API
                const { Readable } = require('stream');
                const stream = Readable.from(file);
                const media = {
                    mimeType,
                    body: stream
                };
                const response = yield this.drive.files.create({
                    requestBody: fileMetadata,
                    media: media,
                    fields: 'id,name,size,webViewLink,webContentLink,createdTime,modifiedTime'
                });
                return {
                    provider: this.providerId,
                    fileId: response.data.id,
                    url: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
                    folderId: parentFolderId,
                    path: `${folderPath || ''}/${filename}`.replace(/^\//, ''),
                    size: parseInt(response.data.size || '0'),
                    mimeType: mimeType,
                    metadata: metadata || {}
                };
            }
            catch (error) {
                console.error(`GoogleDriveService: Upload failed for ${filename}:`, error);
                console.error(`GoogleDriveService: Error details:`, {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    stack: error instanceof Error ? error.stack : undefined,
                    code: error.code,
                    status: error.status,
                    response: (_a = error.response) === null || _a === void 0 ? void 0 : _a.data
                });
                throw new types_1.StorageOperationError(`Failed to upload file ${filename}`, this.providerId, 'uploadFile', error instanceof Error ? error : undefined);
            }
        });
    }
    deleteFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Ensure we have a valid access token
                if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
                    yield this.refreshAccessToken();
                }
                // For Google Drive, we need to get the file ID first
                const fileId = yield this.getFileIdByPath(filePath);
                if (fileId) {
                    yield this.drive.files.delete({ fileId });
                }
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to delete file ${filePath}`, this.providerId, 'deleteFile', error instanceof Error ? error : undefined);
            }
        });
    }
    getFileInfo(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Ensure we have a valid access token
                if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
                    yield this.refreshAccessToken();
                }
                const fileId = yield this.getFileIdByPath(filePath);
                if (!fileId) {
                    throw new Error('File not found');
                }
                const response = yield this.drive.files.get({
                    fileId: fileId,
                    fields: 'id,name,size,mimeType,webViewLink,webContentLink,createdTime,modifiedTime,parents'
                });
                return {
                    provider: this.providerId,
                    fileId: response.data.id,
                    name: response.data.name,
                    path: filePath,
                    size: parseInt(response.data.size || '0'),
                    mimeType: response.data.mimeType,
                    url: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
                    folderId: (_a = response.data.parents) === null || _a === void 0 ? void 0 : _a[0],
                    metadata: {},
                    createdAt: new Date(response.data.createdTime),
                    updatedAt: new Date(response.data.modifiedTime)
                };
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to get file info for ${filePath}`, this.providerId, 'getFileInfo', error instanceof Error ? error : undefined);
            }
        });
    }
    listFiles(folderPath, pageSize) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Ensure we have a valid access token
                if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
                    yield this.refreshAccessToken();
                }
                const parentFolderId = folderPath || this.config.folderId;
                const response = yield this.drive.files.list({
                    q: `'${parentFolderId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`,
                    fields: 'files(id,name,size,mimeType,webViewLink,createdTime,modifiedTime)',
                    pageSize: pageSize || 1000
                });
                return ((_a = response.data.files) === null || _a === void 0 ? void 0 : _a.map((file) => ({
                    provider: this.providerId,
                    fileId: file.id,
                    name: file.name,
                    path: `${folderPath || ''}/${file.name}`.replace(/^\//, ''),
                    size: parseInt(file.size || '0'),
                    mimeType: file.mimeType,
                    url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
                    folderId: parentFolderId,
                    metadata: {},
                    createdAt: new Date(file.createdTime),
                    updatedAt: new Date(file.modifiedTime)
                }))) || [];
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to list files in ${folderPath || 'root'}`, this.providerId, 'listFiles', error instanceof Error ? error : undefined);
            }
        });
    }
    getFileIdByPath(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`GoogleDriveService: Getting file ID for path: ${filePath}`);
                const pathParts = filePath.split('/').filter(Boolean);
                if (pathParts.length === 0) {
                    console.log(`GoogleDriveService: Empty path parts for: ${filePath}`);
                    return null;
                }
                const fileName = pathParts[pathParts.length - 1];
                const folderPath = pathParts.slice(0, -1).join('/');
                console.log(`GoogleDriveService: File name: ${fileName}, folder path: ${folderPath}`);
                let parentFolderId = this.config.folderId;
                if (folderPath) {
                    parentFolderId = (yield this.getFolderIdByPath(folderPath)) || this.config.folderId;
                    console.log(`GoogleDriveService: Resolved folder path to ID: ${parentFolderId}`);
                }
                const query = `'${parentFolderId}' in parents and name='${fileName}' and mimeType!='application/vnd.google-apps.folder' and trashed=false`;
                console.log(`GoogleDriveService: Searching with query: ${query}`);
                const response = yield this.drive.files.list({
                    q: query,
                    fields: 'files(id)',
                    pageSize: 1
                });
                const fileId = response.data.files && response.data.files.length > 0 ? response.data.files[0].id : null;
                console.log(`GoogleDriveService: Found file ID: ${fileId} for path: ${filePath}`);
                return fileId;
            }
            catch (error) {
                console.error('GoogleDriveService: Failed to get file ID by path:', error);
                return null;
            }
        });
    }
    updateFileMetadata(filePath, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Ensure we have a valid access token
                if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
                    yield this.refreshAccessToken();
                }
                const fileId = yield this.getFileIdByPath(filePath);
                if (!fileId) {
                    throw new Error('File not found');
                }
                yield this.drive.files.update({
                    fileId: fileId,
                    requestBody: metadata
                });
            }
            catch (error) {
                throw new types_1.StorageOperationError(`Failed to update metadata for ${filePath}`, this.providerId, 'updateFileMetadata', error instanceof Error ? error : undefined);
            }
        });
    }
    fileExists(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fileId = yield this.getFileIdByPath(filePath);
                return fileId !== null;
            }
            catch (error) {
                return false;
            }
        });
    }
    folderExists(folderPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const folderId = yield this.getFolderIdByPath(folderPath);
                return folderId !== null;
            }
            catch (error) {
                return false;
            }
        });
    }
    getFileUrl(filePath) {
        // For Google Drive, we need to get the file ID first
        // This is a simplified implementation - in practice, you'd want to cache file IDs
        return `/api/storage/serve/google-drive/${filePath}`;
    }
    getFolderUrl(folderPath) {
        // For Google Drive, we need to get the folder ID first
        // This is a simplified implementation - in practice, you'd want to cache folder IDs
        return `/api/storage/serve/google-drive/${folderPath}`;
    }
    getFileBuffer(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`GoogleDriveService: Getting file buffer for path: ${filePath}`);
                // Ensure we have a valid access token
                if (!this.config.accessToken || (this.config.tokenExpiry && new Date() >= this.config.tokenExpiry)) {
                    console.log('GoogleDriveService: Refreshing access token for getFileBuffer...');
                    yield this.refreshAccessToken();
                }
                const fileId = yield this.getFileIdByPath(filePath);
                if (!fileId) {
                    console.log(`GoogleDriveService: Could not find file ID for path: ${filePath}`);
                    return null;
                }
                console.log(`GoogleDriveService: Found file ID: ${fileId} for path: ${filePath}`);
                const response = yield this.drive.files.get({
                    fileId: fileId,
                    alt: 'media'
                });
                console.log(`GoogleDriveService: Successfully downloaded file, size: ${response.data.length} bytes`);
                // Handle different response data types
                if (response.data instanceof Buffer) {
                    return response.data;
                }
                else if (response.data instanceof Uint8Array) {
                    return Buffer.from(response.data);
                }
                else if (response.data instanceof ArrayBuffer) {
                    return Buffer.from(response.data);
                }
                else if (typeof response.data === 'string') {
                    return Buffer.from(response.data, 'binary');
                }
                else {
                    // For Blob or other types, try to convert to ArrayBuffer first
                    console.log(`GoogleDriveService: Response data type: ${typeof response.data}, constructor: ${response.data.constructor.name}`);
                    if (response.data.arrayBuffer) {
                        const arrayBuffer = yield response.data.arrayBuffer();
                        return Buffer.from(arrayBuffer);
                    }
                    else {
                        // Fallback: try to convert directly
                        return Buffer.from(response.data);
                    }
                }
            }
            catch (error) {
                console.error('GoogleDriveService: Failed to get file buffer from Google Drive:', error);
                return null;
            }
        });
    }
}
exports.GoogleDriveService = GoogleDriveService;
