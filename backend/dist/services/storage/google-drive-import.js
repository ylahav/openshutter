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
exports.GoogleDriveImportService = void 0;
const google_drive_1 = require("./providers/google-drive");
class GoogleDriveImportService extends google_drive_1.GoogleDriveService {
    constructor(config) {
        super(config);
    }
    listImportFolders() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const folders = [];
                const config = this.getConfig();
                // Recursively scan folders starting from the root folder
                yield this.scanFoldersRecursively(config.folderId, folders);
                return folders;
            }
            catch (error) {
                console.error('Failed to list Google Drive folders:', error);
                throw new Error(`Failed to list folders: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    scanFoldersRecursively(folderId, folders) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                let nextPageToken;
                do {
                    const response = yield this.drive.files.list({
                        q: `mimeType='application/vnd.google-apps.folder' and '${folderId}' in parents and trashed=false`,
                        pageSize: 100,
                        fields: 'nextPageToken,files(id,name,parents,trashed)',
                        pageToken: nextPageToken
                    });
                    for (const folder of response.data.files || []) {
                        // Skip trashed folders immediately
                        if (folder.trashed) {
                            continue;
                        }
                        // Skip thumb folders immediately as they are part of album data, not separate albums
                        if (((_a = folder.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === 'thumb') {
                            continue;
                        }
                        // Skip trash folders by name immediately
                        if (((_b = folder.name) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes('trash')) || ((_c = folder.name) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes('bin'))) {
                            continue;
                        }
                        const path = yield this.getFolderPath(folder.id);
                        const parentPath = folder.parents && folder.parents.length > 0
                            ? yield this.getFolderPath(folder.parents[0])
                            : undefined;
                        folders.push({
                            id: folder.id,
                            name: folder.name,
                            path,
                            parentPath
                        });
                        // Recursively scan subfolders
                        yield this.scanFoldersRecursively(folder.id, folders);
                    }
                    nextPageToken = response.data.nextPageToken;
                } while (nextPageToken);
            }
            catch (error) {
                console.warn(`Failed to scan folder ${folderId}:`, error);
                // Continue with other folders even if one fails
            }
        });
    }
    listImportFiles(folderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const files = [];
                const config = this.getConfig();
                // Use provided folderId or default to root folder
                const targetFolderId = folderId || config.folderId;
                // If folderId is provided, scan only that folder (non-recursive)
                // If no folderId, scan from root recursively
                const recursive = !folderId;
                yield this.scanFilesRecursively(targetFolderId, files, recursive);
                return files;
            }
            catch (error) {
                console.error('Failed to list Google Drive files:', error);
                throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    scanFilesRecursively(folderId_1, files_1) {
        return __awaiter(this, arguments, void 0, function* (folderId, files, recursive = true) {
            var _a;
            try {
                let nextPageToken;
                do {
                    const query = `mimeType contains 'image/' and '${folderId}' in parents and trashed=false`;
                    const response = yield this.drive.files.list({
                        q: query,
                        pageSize: 100,
                        fields: 'nextPageToken,files(id,name,parents,size,mimeType,trashed)',
                        pageToken: nextPageToken
                    });
                    for (const file of response.data.files || []) {
                        try {
                            // Skip trashed files immediately
                            if (file.trashed) {
                                continue;
                            }
                            // Skip files that start with 'thumb-' as they are thumbnails
                            if ((_a = file.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().startsWith('thumb-')) {
                                continue;
                            }
                            const path = yield this.getFilePath(file.id);
                            const parentPath = file.parents && file.parents.length > 0
                                ? yield this.getFolderPath(file.parents[0])
                                : '';
                            // Skip files in thumb folders as they are thumbnails, not original photos
                            if (parentPath.includes('/thumb')) {
                                continue;
                            }
                            // Skip files in trash folders
                            if (parentPath.toLowerCase().includes('trash') || parentPath.toLowerCase().includes('bin')) {
                                continue;
                            }
                            files.push({
                                id: file.id,
                                name: file.name,
                                path,
                                parentPath,
                                size: parseInt(file.size || '0'),
                                mimeType: file.mimeType
                            });
                        }
                        catch (fileError) {
                            console.warn(`Failed to process file ${file.name}:`, fileError.message);
                            // Continue with other files
                        }
                    }
                    nextPageToken = response.data.nextPageToken;
                } while (nextPageToken);
                // Also scan for subfolders and recursively scan files in them (only if recursive=true)
                if (recursive) {
                    const subfoldersResponse = yield this.drive.files.list({
                        q: `mimeType='application/vnd.google-apps.folder' and '${folderId}' in parents and trashed=false`,
                        pageSize: 100,
                        fields: 'files(id)'
                    });
                    for (const subfolder of subfoldersResponse.data.files || []) {
                        yield this.scanFilesRecursively(subfolder.id, files, true);
                    }
                }
            }
            catch (error) {
                console.warn(`Failed to scan files in folder ${folderId}:`, error);
                // Continue with other folders even if one fails
            }
        });
    }
    getImportFileBuffer(fileId) {
        const _super = Object.create(null, {
            getFileBuffer: { get: () => super.getFileBuffer }
        });
        return __awaiter(this, void 0, void 0, function* () {
            // Use the provider's getFileBuffer method which handles path resolution
            // First, we need to get the file path from the fileId
            try {
                const response = yield this.drive.files.get({
                    fileId,
                    fields: 'id,name,parents'
                });
                const file = response.data;
                const parentPath = file.parents && file.parents.length > 0
                    ? yield this.getFolderPath(file.parents[0])
                    : '/';
                const filePath = `${parentPath}/${file.name}`;
                return yield _super.getFileBuffer.call(this, filePath);
            }
            catch (error) {
                console.error(`Failed to get file buffer for ${fileId}:`, error);
                return null;
            }
        });
    }
    getFolderPath(folderId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const config = this.getConfig();
                // If this is the root folder ID from config, return root path
                if (folderId === config.folderId) {
                    return '/';
                }
                const pathParts = [];
                let currentId = folderId;
                while (currentId) {
                    // Check if we've reached the root folder BEFORE making the API call
                    if (currentId === config.folderId) {
                        break;
                    }
                    try {
                        const response = yield this.drive.files.get({
                            fileId: currentId,
                            fields: 'id,name,parents'
                        });
                        const folder = response.data;
                        pathParts.unshift(folder.name);
                        // If no parents, stop here
                        if (!folder.parents || folder.parents.length === 0) {
                            break;
                        }
                        currentId = folder.parents[0];
                    }
                    catch (folderError) {
                        // If we can't access a parent folder, stop traversing and use what we have
                        console.warn(`Cannot access parent folder ${currentId}:`, folderError.message);
                        break;
                    }
                }
                return pathParts.length > 0 ? '/' + pathParts.join('/') : `/${folderId}`;
            }
            catch (error) {
                console.error(`Failed to get folder path for ${folderId}:`, error);
                return `/${folderId}`;
            }
        });
    }
    getFilePath(fileId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.drive.files.get({
                    fileId,
                    fields: 'id,name,parents'
                });
                const file = response.data;
                const parentPath = file.parents && file.parents.length > 0
                    ? yield this.getFolderPath(file.parents[0])
                    : '/';
                return `${parentPath}/${file.name}`;
            }
            catch (error) {
                console.error(`Failed to get file path for ${fileId}:`, error);
                return `/${fileId}`;
            }
        });
    }
}
exports.GoogleDriveImportService = GoogleDriveImportService;
