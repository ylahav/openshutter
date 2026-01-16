"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.AlbumsAdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("../common/guards/admin.guard");
const albums_service_1 = require("./albums.service");
const db_1 = require("../config/db");
const mongoose_1 = __importStar(require("mongoose"));
const manager_1 = require("../services/storage/manager");
let AlbumsAdminController = class AlbumsAdminController {
    constructor(albumsService) {
        this.albumsService = albumsService;
    }
    /**
     * Create a new album
     * Path: POST /api/admin/albums
     */
    createAlbum(req, createData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                // Get user from request (set by AdminGuard)
                const user = req.user;
                if (!user || !user.id) {
                    throw new common_1.BadRequestException('User not authenticated');
                }
                // Validate required fields
                if (!createData.name || !createData.alias) {
                    throw new common_1.BadRequestException('Name and alias are required');
                }
                if (!createData.storageProvider) {
                    throw new common_1.BadRequestException('Storage provider is required');
                }
                // Validate storage provider
                const validProviders = ['google-drive', 'aws-s3', 'local', 'backblaze', 'wasabi'];
                if (!validProviders.includes(createData.storageProvider)) {
                    throw new common_1.BadRequestException(`Invalid storage provider: ${createData.storageProvider}`);
                }
                // Get parent album info if parentAlbumId is provided
                let parentAlbum = null;
                let parentPath = '';
                let level = 0;
                if (createData.parentAlbumId && createData.parentAlbumId !== '' && createData.parentAlbumId !== 'null') {
                    try {
                        const parentObjectId = new mongoose_1.Types.ObjectId(createData.parentAlbumId);
                        parentAlbum = yield db.collection('albums').findOne({ _id: parentObjectId });
                        if (!parentAlbum) {
                            throw new common_1.NotFoundException(`Parent album not found: ${createData.parentAlbumId}`);
                        }
                        parentPath = parentAlbum.storagePath || '';
                        level = (parentAlbum.level || 0) + 1;
                    }
                    catch (error) {
                        if (error instanceof common_1.NotFoundException) {
                            throw error;
                        }
                        throw new common_1.BadRequestException(`Invalid parent album ID: ${createData.parentAlbumId}`);
                    }
                }
                // Generate storage path
                const storagePath = parentPath ? `${parentPath}/${createData.alias}` : `/${createData.alias}`;
                // Check if alias already exists
                const existingAlbum = yield db.collection('albums').findOne({ alias: createData.alias.toLowerCase() });
                if (existingAlbum) {
                    throw new common_1.BadRequestException(`Album with alias "${createData.alias}" already exists`);
                }
                // Create folder in storage provider
                const storageManager = manager_1.StorageManager.getInstance();
                let storageFolderResult;
                try {
                    storageFolderResult = yield storageManager.createAlbum(createData.name, createData.alias, createData.storageProvider, parentPath || undefined);
                    console.log('Storage folder created:', storageFolderResult);
                }
                catch (storageError) {
                    console.error('Failed to create storage folder:', storageError);
                    throw new common_1.BadRequestException(`Failed to create storage folder: ${storageError.message || 'Unknown error'}`);
                }
                // Get the maximum order value for siblings (albums with same parent)
                const parentIdForQuery = parentAlbum ? parentAlbum._id : null;
                const maxOrderResult = yield db
                    .collection('albums')
                    .find({ parentAlbumId: parentIdForQuery })
                    .sort({ order: -1 })
                    .limit(1)
                    .toArray();
                const maxOrder = maxOrderResult.length > 0 ? (maxOrderResult[0].order || 0) + 1 : 0;
                // Create album record
                const albumData = {
                    name: createData.name,
                    alias: createData.alias.toLowerCase().trim(),
                    description: createData.description || '',
                    isPublic: createData.isPublic !== undefined ? createData.isPublic : false,
                    isFeatured: createData.isFeatured !== undefined ? createData.isFeatured : false,
                    storageProvider: createData.storageProvider,
                    storagePath: storagePath,
                    parentAlbumId: parentAlbum ? parentAlbum._id : null,
                    parentPath: parentPath,
                    level: level,
                    order: maxOrder,
                    photoCount: 0,
                    createdBy: new mongoose_1.Types.ObjectId(user.id),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    tags: [],
                    allowedGroups: [],
                    allowedUsers: [],
                };
                const result = yield db.collection('albums').insertOne(albumData);
                if (!result.insertedId) {
                    throw new Error('Failed to create album');
                }
                // Fetch the created album
                const createdAlbum = yield db.collection('albums').findOne({ _id: result.insertedId });
                if (!createdAlbum) {
                    throw new Error('Album was created but could not be retrieved');
                }
                // Serialize ObjectIds
                const serialized = Object.assign(Object.assign({}, createdAlbum), { _id: createdAlbum._id.toString(), createdBy: ((_a = createdAlbum.createdBy) === null || _a === void 0 ? void 0 : _a.toString()) || null, parentAlbumId: ((_b = createdAlbum.parentAlbumId) === null || _b === void 0 ? void 0 : _b.toString()) || null, coverPhotoId: ((_c = createdAlbum.coverPhotoId) === null || _c === void 0 ? void 0 : _c.toString()) || null, tags: ((_d = createdAlbum.tags) === null || _d === void 0 ? void 0 : _d.map((tag) => (tag._id ? tag._id.toString() : tag.toString()))) || [] });
                return {
                    success: true,
                    data: serialized,
                };
            }
            catch (error) {
                console.error('Failed to create album:', error);
                if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException) {
                    throw error;
                }
                throw new common_1.BadRequestException(`Failed to create album: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Get all albums (admin only - includes private albums)
     * Path: GET /api/admin/albums
     */
    findAll(parentId, level) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                const query = {};
                // Handle parentId filter (admin can see all, no isPublic filter)
                if (parentId === 'root' || parentId === 'null') {
                    query.parentAlbumId = null;
                }
                else if (parentId) {
                    if (!mongoose_1.Types.ObjectId.isValid(parentId)) {
                        console.warn(`Invalid parentId format: ${parentId}`);
                        return [];
                    }
                    query.parentAlbumId = new mongoose_1.Types.ObjectId(parentId);
                }
                // Support level filter
                if (level !== undefined) {
                    const levelNum = parseInt(level, 10);
                    if (!isNaN(levelNum)) {
                        query.level = levelNum;
                    }
                }
                // Get ALL albums (no isPublic filter for admin)
                const albums = yield db
                    .collection('albums')
                    .find(query)
                    .sort({ order: 1, createdAt: -1 })
                    .toArray();
                // Serialize ObjectIds
                const serialized = albums.map((album) => {
                    var _a, _b, _c;
                    return (Object.assign(Object.assign({}, album), { _id: album._id.toString(), parentAlbumId: ((_a = album.parentAlbumId) === null || _a === void 0 ? void 0 : _a.toString()) || null, coverPhotoId: ((_b = album.coverPhotoId) === null || _b === void 0 ? void 0 : _b.toString()) || null, createdBy: ((_c = album.createdBy) === null || _c === void 0 ? void 0 : _c.toString()) || null }));
                });
                return serialized;
            }
            catch (error) {
                console.error('Failed to get admin albums:', error);
                throw new Error(`Failed to get admin albums: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Get all photos for an album (admin only - includes unpublished)
     * Path: GET /api/admin/albums/:id/photos
     */
    getAlbumPhotos(id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                let objectId;
                try {
                    objectId = new mongoose_1.Types.ObjectId(id);
                }
                catch (_error) {
                    throw new Error('Invalid album ID format');
                }
                // Get ALL photos for this album (including unpublished) - admin only
                const photosCollection = db.collection('photos');
                const query = {
                    $or: [{ albumId: objectId }, { albumId: id }],
                };
                const photos = yield photosCollection
                    .find(query)
                    .sort({ uploadedAt: -1 })
                    .toArray();
                console.log(`Found ${photos.length} photos for album ${id}`);
                if (photos.length > 0) {
                    console.log('Sample photo storage:', {
                        hasStorage: !!photos[0].storage,
                        storage: photos[0].storage,
                        thumbnailPath: (_a = photos[0].storage) === null || _a === void 0 ? void 0 : _a.thumbnailPath,
                        url: (_b = photos[0].storage) === null || _b === void 0 ? void 0 : _b.url,
                    });
                }
                // Convert ObjectIds to strings for JSON serialization
                const serializedPhotos = photos.map((photo) => {
                    const serialized = Object.assign(Object.assign({}, photo), { _id: photo._id.toString(), albumId: photo.albumId ? photo.albumId.toString() : null, tags: photo.tags ? photo.tags.map((tag) => (tag._id ? tag._id.toString() : tag.toString())) : [], people: photo.people
                            ? photo.people.map((person) => (person._id ? person._id.toString() : person.toString()))
                            : [], location: photo.location
                            ? photo.location._id
                                ? photo.location._id.toString()
                                : photo.location.toString()
                            : null });
                    // Ensure storage object is properly preserved
                    if (photo.storage) {
                        serialized.storage = {
                            provider: photo.storage.provider || 'local',
                            fileId: photo.storage.fileId || '',
                            url: photo.storage.url || '',
                            path: photo.storage.path || '',
                            thumbnailPath: photo.storage.thumbnailPath || photo.storage.url || '',
                            thumbnails: photo.storage.thumbnails || {},
                            blurDataURL: photo.storage.blurDataURL,
                            bucket: photo.storage.bucket,
                            folderId: photo.storage.folderId,
                        };
                    }
                    return serialized;
                });
                return {
                    success: true,
                    data: serializedPhotos,
                };
            }
            catch (error) {
                console.error('Failed to get admin album photos:', error);
                throw new Error(`Failed to get admin album photos: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    /**
     * Update an album (admin only)
     * Path: PUT /api/admin/albums/:id
     */
    updateAlbum(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                let objectId;
                try {
                    objectId = new mongoose_1.Types.ObjectId(id);
                }
                catch (_error) {
                    throw new common_1.BadRequestException('Invalid album ID format');
                }
                // Check if album exists
                const album = yield db.collection('albums').findOne({ _id: objectId });
                if (!album) {
                    throw new common_1.NotFoundException('Album not found');
                }
                // Prepare update object
                const update = {
                    updatedAt: new Date(),
                };
                // Update name if provided (handle both string and multilingual formats)
                if (updateData.name !== undefined) {
                    if (typeof updateData.name === 'string') {
                        update.name = updateData.name;
                    }
                    else if (typeof updateData.name === 'object' && updateData.name !== null) {
                        // Multilingual format - store as Mixed type
                        update.name = updateData.name;
                    }
                }
                // Update description if provided (handle both string and multilingual formats)
                if (updateData.description !== undefined) {
                    if (typeof updateData.description === 'string') {
                        update.description = updateData.description;
                    }
                    else if (typeof updateData.description === 'object' && updateData.description !== null) {
                        // Multilingual format - store as Mixed type
                        update.description = updateData.description;
                    }
                    else if (updateData.description === null || updateData.description === '') {
                        update.description = '';
                    }
                }
                // Update boolean flags
                if (updateData.isPublic !== undefined) {
                    update.isPublic = updateData.isPublic;
                }
                if (updateData.isFeatured !== undefined) {
                    update.isFeatured = updateData.isFeatured;
                }
                if (updateData.showExifData !== undefined) {
                    update.showExifData = updateData.showExifData;
                }
                // Update order
                if (updateData.order !== undefined) {
                    update.order = parseInt(updateData.order, 10) || 0;
                }
                // Update tags if provided (convert string IDs to ObjectIds)
                if (updateData.tags !== undefined && Array.isArray(updateData.tags)) {
                    update.tags = updateData.tags
                        .filter((tagId) => tagId && mongoose_1.Types.ObjectId.isValid(tagId))
                        .map((tagId) => new mongoose_1.Types.ObjectId(tagId));
                }
                // Update people if provided (convert string IDs to ObjectIds)
                if (updateData.people !== undefined && Array.isArray(updateData.people)) {
                    update.people = updateData.people
                        .filter((personId) => personId && mongoose_1.Types.ObjectId.isValid(personId))
                        .map((personId) => new mongoose_1.Types.ObjectId(personId));
                }
                // Update location if provided
                if (updateData.location !== undefined) {
                    if (updateData.location === null || updateData.location === '') {
                        update.location = null;
                    }
                    else if (mongoose_1.Types.ObjectId.isValid(updateData.location)) {
                        update.location = new mongoose_1.Types.ObjectId(updateData.location);
                    }
                    else if (typeof updateData.location === 'object' && updateData.location._id) {
                        update.location = new mongoose_1.Types.ObjectId(updateData.location._id);
                    }
                }
                // Update metadata if provided
                if (updateData.metadata !== undefined) {
                    update.metadata = updateData.metadata;
                }
                // Perform update
                const result = yield db.collection('albums').updateOne({ _id: objectId }, { $set: update });
                if (result.matchedCount === 0) {
                    throw new common_1.NotFoundException('Album not found');
                }
                // Fetch updated album
                const updatedAlbum = yield db.collection('albums').findOne({ _id: objectId });
                if (!updatedAlbum) {
                    throw new common_1.NotFoundException('Album not found after update');
                }
                // Serialize ObjectIds
                const serialized = Object.assign(Object.assign({}, updatedAlbum), { _id: updatedAlbum._id.toString(), createdBy: ((_a = updatedAlbum.createdBy) === null || _a === void 0 ? void 0 : _a.toString()) || null, parentAlbumId: ((_b = updatedAlbum.parentAlbumId) === null || _b === void 0 ? void 0 : _b.toString()) || null, coverPhotoId: ((_c = updatedAlbum.coverPhotoId) === null || _c === void 0 ? void 0 : _c.toString()) || null, tags: ((_d = updatedAlbum.tags) === null || _d === void 0 ? void 0 : _d.map((tag) => (tag._id ? tag._id.toString() : tag.toString()))) || [], people: ((_e = updatedAlbum.people) === null || _e === void 0 ? void 0 : _e.map((person) => (person._id ? person._id.toString() : person.toString()))) || [], location: updatedAlbum.location
                        ? updatedAlbum.location._id
                            ? updatedAlbum.location._id.toString()
                            : updatedAlbum.location.toString()
                        : null, allowedUsers: ((_f = updatedAlbum.allowedUsers) === null || _f === void 0 ? void 0 : _f.map((userId) => userId.toString())) || [] });
                return serialized;
            }
            catch (error) {
                console.error('Failed to update album:', error);
                if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                    throw error;
                }
                throw new Error(`Failed to update album: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
};
exports.AlbumsAdminController = AlbumsAdminController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AlbumsAdminController.prototype, "createAlbum", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('parentId')),
    __param(1, (0, common_1.Query)('level')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AlbumsAdminController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id/photos'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AlbumsAdminController.prototype, "getAlbumPhotos", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AlbumsAdminController.prototype, "updateAlbum", null);
exports.AlbumsAdminController = AlbumsAdminController = __decorate([
    (0, common_1.Controller)('admin/albums'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [albums_service_1.AlbumsService])
], AlbumsAdminController);
