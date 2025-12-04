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
exports.AlbumsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const mongoose_3 = require("@nestjs/mongoose");
const mongoose_4 = require("mongoose");
let AlbumsService = class AlbumsService {
    constructor(albumModel, photoModel, connection) {
        this.albumModel = albumModel;
        this.photoModel = photoModel;
        this.connection = connection;
    }
    findAll(parentId, level) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const query = {};
            // Only filter by isPublic for root-level queries
            // For sub-albums, return all albums (access control can be handled at app level)
            if (parentId === 'root' || parentId === 'null' || !parentId) {
                query.isPublic = true;
            }
            if (parentId === 'root' || parentId === 'null') {
                query.parentAlbumId = null;
            }
            else if (parentId) {
                // Validate it's a valid ObjectId format first
                if (!mongoose_2.Types.ObjectId.isValid(parentId)) {
                    console.warn(`Invalid parentId format: ${parentId}`);
                    return [];
                }
                // Use string directly - Mongoose automatically converts string IDs to ObjectId when querying ObjectId fields
                // Explicit ObjectId conversion was causing issues, so let Mongoose handle it
                query.parentAlbumId = parentId;
            }
            // Support level filter (for root albums, level 0)
            if (level !== undefined) {
                const levelNum = parseInt(level, 10);
                if (!isNaN(levelNum)) {
                    query.level = levelNum;
                }
            }
            // Log query with better ObjectId representation
            const queryLog = Object.assign({}, query);
            if (queryLog.parentAlbumId) {
                queryLog.parentAlbumId = queryLog.parentAlbumId.toString();
            }
            console.log('AlbumsService.findAll query:', JSON.stringify(queryLog, null, 2));
            console.log('AlbumsService.findAll query (raw):', query);
            // Try the query - if parentAlbumId is an ObjectId, Mongoose should match it correctly
            let albums = yield this.albumModel
                .find(query)
                .sort({ order: 1, createdAt: -1 })
                .populate('coverPhotoId')
                .exec();
            console.log(`AlbumsService.findAll found ${albums.length} albums for parentId: ${parentId} with ObjectId query`);
            if (albums.length > 0) {
                console.log('Sample album from query:', {
                    _id: (_a = albums[0]._id) === null || _a === void 0 ? void 0 : _a.toString(),
                    alias: albums[0].alias,
                    name: albums[0].name,
                    nameType: typeof albums[0].name,
                    hasName: !!albums[0].name
                });
            }
            // If no results and we have a parentId, try alternative query approaches
            if (albums.length === 0 && parentId && parentId !== 'root' && parentId !== 'null') {
                console.log('Trying alternative query approaches...');
                // Try 1: Query with string (Mongoose auto-converts)
                const altQuery1 = Object.assign({}, query);
                altQuery1.parentAlbumId = parentId;
                albums = yield this.albumModel
                    .find(altQuery1)
                    .sort({ order: 1, createdAt: -1 })
                    .populate('coverPhotoId')
                    .exec();
                console.log(`Alternative query 1 (string) found ${albums.length} albums`);
                // Try 2: Use $in operator
                if (albums.length === 0) {
                    const altQuery2 = Object.assign({}, query);
                    altQuery2.parentAlbumId = { $in: [new mongoose_2.Types.ObjectId(parentId), parentId] };
                    albums = yield this.albumModel
                        .find(altQuery2)
                        .sort({ order: 1, createdAt: -1 })
                        .populate('coverPhotoId')
                        .exec();
                    console.log(`Alternative query 2 ($in) found ${albums.length} albums`);
                }
                // Try 3: Find all and filter manually (fallback)
                if (albums.length === 0) {
                    console.log('Using manual filter as fallback...');
                    const allAlbums = yield this.albumModel
                        .find({})
                        .sort({ order: 1, createdAt: -1 })
                        .populate('coverPhotoId')
                        .exec();
                    albums = allAlbums.filter(a => {
                        if (!a.parentAlbumId)
                            return false;
                        return a.parentAlbumId.toString() === parentId;
                    });
                    console.log(`Manual filter found ${albums.length} albums`);
                }
            }
            // Debug: Try multiple query formats to diagnose the issue
            if (parentId && parentId !== 'root' && parentId !== 'null') {
                const countWithObjectId = yield this.albumModel.countDocuments({ parentAlbumId: new mongoose_2.Types.ObjectId(parentId) });
                console.log(`Direct count with ObjectId for parentId ${parentId}: ${countWithObjectId} albums`);
                // Also try as string (Mongoose should auto-convert)
                const countWithString = yield this.albumModel.countDocuments({ parentAlbumId: parentId });
                console.log(`Direct count with string for parentId ${parentId}: ${countWithString} albums`);
                // Try with $eq operator
                const countWithEq = yield this.albumModel.countDocuments({ parentAlbumId: { $eq: parentId } });
                console.log(`Direct count with $eq for parentId ${parentId}: ${countWithEq} albums`);
                // Try finding all albums and logging their parentAlbumId values
                const allAlbums = yield this.albumModel.find({}).select('_id alias parentAlbumId').limit(10).exec();
                console.log('Sample albums with parentAlbumId:', allAlbums.map(a => ({
                    _id: a._id.toString(),
                    alias: a.alias,
                    parentAlbumId: a.parentAlbumId ? a.parentAlbumId.toString() : null,
                    parentAlbumIdType: typeof a.parentAlbumId,
                    parentAlbumIdConstructor: a.parentAlbumId ? a.parentAlbumId.constructor.name : null
                })));
                // Find the specific album we're looking for
                const targetParentId = parentId;
                const albumsWithParent = yield this.albumModel.find({}).select('_id alias parentAlbumId').exec();
                const matchingAlbums = albumsWithParent.filter(a => {
                    if (!a.parentAlbumId)
                        return false;
                    const parentStr = a.parentAlbumId.toString();
                    return parentStr === targetParentId;
                });
                console.log(`Found ${matchingAlbums.length} albums with parentAlbumId matching ${targetParentId}:`, matchingAlbums.map(a => ({
                    _id: a._id.toString(),
                    alias: a.alias,
                    parentAlbumId: a.parentAlbumId ? a.parentAlbumId.toString() : null,
                    parentAlbumIdType: typeof a.parentAlbumId
                })));
                // Try querying with $or to match both string and ObjectId
                const orQuery = {
                    $or: [
                        { parentAlbumId: new mongoose_2.Types.ObjectId(parentId) },
                        { parentAlbumId: parentId },
                        { parentAlbumId: { $eq: new mongoose_2.Types.ObjectId(parentId) } }
                    ]
                };
                const countWithOr = yield this.albumModel.countDocuments(orQuery);
                console.log(`Count with $or query (ObjectId, string, $eq ObjectId): ${countWithOr} albums`);
            }
            return albums;
        });
    }
    findOneByIdOrAlias(idOrAlias) {
        return __awaiter(this, void 0, void 0, function* () {
            let album;
            // Check if valid ObjectId
            if (idOrAlias.match(/^[0-9a-fA-F]{24}$/)) {
                album = yield this.albumModel
                    .findById(idOrAlias)
                    .select('+name +description') // Explicitly include name and description fields
                    .populate('coverPhotoId')
                    .lean() // Use lean() to get plain object and avoid schema type issues
                    .exec();
            }
            // If not found by ID, try alias
            if (!album) {
                album = yield this.albumModel
                    .findOne({ alias: idOrAlias })
                    .select('+name +description') // Explicitly include name and description fields
                    .populate('coverPhotoId')
                    .lean() // Use lean() to get plain object and avoid schema type issues
                    .exec();
            }
            if (!album) {
                throw new common_1.NotFoundException('Album not found');
            }
            // Debug log to see what we got
            console.log('findOneByIdOrAlias - album.name:', JSON.stringify(album.name));
            console.log('findOneByIdOrAlias - album keys:', Object.keys(album));
            return album;
        });
    }
    findByAlias(alias) {
        return __awaiter(this, void 0, void 0, function* () {
            const album = yield this.albumModel
                .findOne({ alias })
                .populate('coverPhotoId')
                .exec();
            if (!album) {
                throw new common_1.NotFoundException('Album not found');
            }
            return album;
        });
    }
    findPhotosByAlbumId(albumId_1) {
        return __awaiter(this, arguments, void 0, function* (albumId, page = 1, limit = 50) {
            const skip = (page - 1) * limit;
            // Convert albumId to ObjectId for proper query matching
            const albumObjectId = new mongoose_2.Types.ObjectId(albumId);
            console.log('findPhotosByAlbumId - Querying photos for albumId:', albumId);
            console.log('findPhotosByAlbumId - albumObjectId:', albumObjectId.toString());
            let photos = [];
            let query = { albumId: albumObjectId, isPublished: true };
            // Try query with ObjectId first
            photos = yield this.photoModel
                .find(query)
                .sort({ uploadedAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('tags')
                .populate('people')
                .populate('location')
                .lean()
                .exec();
            console.log(`findPhotosByAlbumId - Query with ObjectId found ${photos.length} photos`);
            // If no results, try with string ID
            if (photos.length === 0) {
                console.log('findPhotosByAlbumId - Trying query with string ID...');
                query = { albumId: albumId, isPublished: true };
                photos = yield this.photoModel
                    .find(query)
                    .sort({ uploadedAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate('tags')
                    .populate('people')
                    .populate('location')
                    .lean()
                    .exec();
                console.log(`findPhotosByAlbumId - Query with string ID found ${photos.length} photos`);
            }
            // If still no results, try native MongoDB query
            if (photos.length === 0 && this.connection.db) {
                console.log('findPhotosByAlbumId - Trying native MongoDB query...');
                const db = this.connection.db;
                const photosCollection = db.collection('photos');
                // Try with ObjectId
                const nativePhotos = yield photosCollection
                    .find({
                    albumId: albumObjectId,
                    isPublished: true
                })
                    .sort({ uploadedAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .toArray();
                console.log(`findPhotosByAlbumId - Native MongoDB query (ObjectId) found ${nativePhotos.length} photos`);
                if (nativePhotos.length > 0) {
                    // Convert native results and populate references manually if needed
                    photos = nativePhotos.map((doc) => {
                        var _a;
                        return (Object.assign(Object.assign({}, doc), { _id: doc._id.toString(), albumId: (_a = doc.albumId) === null || _a === void 0 ? void 0 : _a.toString() }));
                    });
                }
                else {
                    // Try with string
                    const nativePhotosString = yield photosCollection
                        .find({
                        albumId: albumId,
                        isPublished: true
                    })
                        .sort({ uploadedAt: -1 })
                        .skip(skip)
                        .limit(limit)
                        .toArray();
                    console.log(`findPhotosByAlbumId - Native MongoDB query (string) found ${nativePhotosString.length} photos`);
                    if (nativePhotosString.length > 0) {
                        photos = nativePhotosString.map((doc) => {
                            var _a;
                            return (Object.assign(Object.assign({}, doc), { _id: doc._id.toString(), albumId: (_a = doc.albumId) === null || _a === void 0 ? void 0 : _a.toString() }));
                        });
                    }
                }
            }
            // Get total count with the same query
            const total = yield this.photoModel.countDocuments(query);
            console.log(`findPhotosByAlbumId - Total photos: ${total}`);
            // Ensure storage objects are properly serialized
            const serializedPhotos = photos.map((photo) => {
                const serialized = Object.assign(Object.assign({}, photo), { _id: photo._id.toString(), albumId: photo.albumId ? photo.albumId.toString() : null, tags: photo.tags
                        ? photo.tags.map((tag) => (tag._id ? tag._id.toString() : tag.toString()))
                        : [], people: photo.people
                        ? photo.people.map((person) => person._id ? person._id.toString() : person.toString())
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
                photos: serializedPhotos,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        });
    }
    /**
     * Get complete album data including sub-albums and photos
     */
    getAlbumData(idOrAlias_1) {
        return __awaiter(this, arguments, void 0, function* (idOrAlias, page = 1, limit = 50) {
            var _a, _b;
            // Get the album
            const album = yield this.findOneByIdOrAlias(idOrAlias);
            if (!album) {
                throw new common_1.NotFoundException('Album not found');
            }
            const albumId = album._id.toString();
            const albumObjectId = new mongoose_2.Types.ObjectId(albumId);
            // Get sub-albums - try multiple query approaches
            console.log('getAlbumData - Querying sub-albums for albumId:', albumId);
            console.log('getAlbumData - albumObjectId:', albumObjectId.toString());
            // First, let's check what parentAlbumId values actually exist in the database
            // Find a few albums to see their parentAlbumId structure
            const sampleAlbums = yield this.albumModel
                .find({})
                .limit(10)
                .select('_id alias parentAlbumId')
                .lean()
                .exec();
            console.log('getAlbumData - Sample albums with parentAlbumId:', sampleAlbums.map((a) => {
                var _a, _b, _c;
                return ({
                    _id: (_a = a._id) === null || _a === void 0 ? void 0 : _a.toString(),
                    alias: a.alias,
                    parentAlbumId: a.parentAlbumId,
                    parentAlbumIdType: typeof a.parentAlbumId,
                    parentAlbumIdString: (_b = a.parentAlbumId) === null || _b === void 0 ? void 0 : _b.toString(),
                    parentAlbumIdMatches: ((_c = a.parentAlbumId) === null || _c === void 0 ? void 0 : _c.toString()) === albumId
                });
            }));
            // Try querying with native MongoDB collection to bypass Mongoose type conversion
            console.log('getAlbumData - Trying native MongoDB query...');
            const db = this.connection.db;
            let subAlbums = [];
            if (db) {
                const albumsCollection = db.collection('albums');
                // Try query with string ID first
                console.log('getAlbumData - Native query with string ID:', albumId);
                const nativeQueryString = yield albumsCollection
                    .find({
                    parentAlbumId: albumId,
                    isPublic: true
                })
                    .sort({ order: 1 })
                    .toArray();
                console.log(`getAlbumData - Native MongoDB query (string) found ${nativeQueryString.length} sub-albums`);
                // Try query with ObjectId
                if (nativeQueryString.length === 0) {
                    console.log('getAlbumData - Native query with ObjectId:', albumObjectId.toString());
                    const nativeQueryObjectId = yield albumsCollection
                        .find({
                        parentAlbumId: albumObjectId,
                        isPublic: true
                    })
                        .sort({ order: 1 })
                        .toArray();
                    console.log(`getAlbumData - Native MongoDB query (ObjectId) found ${nativeQueryObjectId.length} sub-albums`);
                    if (nativeQueryObjectId.length > 0) {
                        subAlbums = nativeQueryObjectId.map((doc) => {
                            const result = Object.assign(Object.assign({}, doc), { _id: doc._id.toString() });
                            if (doc.parentAlbumId) {
                                result.parentAlbumId = doc.parentAlbumId.toString();
                            }
                            if (doc.coverPhotoId) {
                                result.coverPhotoId = doc.coverPhotoId.toString();
                            }
                            return result;
                        });
                    }
                }
                else {
                    subAlbums = nativeQueryString.map((doc) => {
                        const result = Object.assign(Object.assign({}, doc), { _id: doc._id.toString() });
                        if (doc.parentAlbumId) {
                            result.parentAlbumId = doc.parentAlbumId.toString();
                        }
                        if (doc.coverPhotoId) {
                            result.coverPhotoId = doc.coverPhotoId.toString();
                        }
                        return result;
                    });
                }
                console.log(`getAlbumData - Final sub-albums count: ${subAlbums.length}`);
                if (subAlbums.length > 0) {
                    console.log('getAlbumData - Sub-albums:', subAlbums.map((a) => ({
                        _id: a._id,
                        alias: a.alias,
                        name: a.name,
                        isPublic: a.isPublic
                    })));
                }
            }
            else {
                console.log('getAlbumData - Database connection not available, falling back to Mongoose query');
                // Fallback to Mongoose query
                const mongooseResults = yield this.albumModel
                    .find({ parentAlbumId: albumObjectId, isPublic: true })
                    .select('+name +description')
                    .sort({ order: 1 })
                    .lean()
                    .exec();
                console.log(`getAlbumData - Mongoose ObjectId query found ${mongooseResults.length} sub-albums`);
                subAlbums = mongooseResults;
            }
            console.log(`getAlbumData - Final result: ${subAlbums.length} sub-albums`);
            if (subAlbums.length > 0) {
                console.log('getAlbumData - First sub-album:', {
                    _id: (_a = subAlbums[0]._id) === null || _a === void 0 ? void 0 : _a.toString(),
                    name: subAlbums[0].name,
                    alias: subAlbums[0].alias,
                    parentAlbumId: (_b = subAlbums[0].parentAlbumId) === null || _b === void 0 ? void 0 : _b.toString(),
                    isPublic: subAlbums[0].isPublic
                });
            }
            // Get photos
            console.log('getAlbumData - Fetching photos for albumId:', albumId);
            const photosData = yield this.findPhotosByAlbumId(albumId, page, limit);
            console.log(`getAlbumData - Received ${photosData.photos.length} photos`);
            // Serialize album (album is already a plain object from lean())
            const serializedAlbum = Object.assign(Object.assign({}, album), { _id: album._id.toString(), parentAlbumId: album.parentAlbumId ? album.parentAlbumId.toString() : null, coverPhotoId: album.coverPhotoId ? (album.coverPhotoId._id ? album.coverPhotoId._id.toString() : album.coverPhotoId.toString()) : null });
            // Debug log to see what we're returning
            console.log('getAlbumData - serializedAlbum.name:', JSON.stringify(serializedAlbum.name));
            console.log('getAlbumData - serializedAlbum.name type:', typeof serializedAlbum.name);
            console.log('getAlbumData - serializedAlbum keys:', Object.keys(serializedAlbum));
            // Serialize sub-albums
            const serializedSubAlbums = subAlbums.map((subAlbum) => (Object.assign(Object.assign({}, subAlbum), { _id: subAlbum._id.toString(), parentAlbumId: subAlbum.parentAlbumId ? subAlbum.parentAlbumId.toString() : null, coverPhotoId: subAlbum.coverPhotoId ? (subAlbum.coverPhotoId._id ? subAlbum.coverPhotoId._id.toString() : subAlbum.coverPhotoId.toString()) : null })));
            return {
                album: serializedAlbum,
                subAlbums: serializedSubAlbums,
                photos: photosData.photos,
                pagination: photosData.pagination,
            };
        });
    }
};
exports.AlbumsService = AlbumsService;
exports.AlbumsService = AlbumsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Album')),
    __param(1, (0, mongoose_1.InjectModel)('Photo')),
    __param(2, (0, mongoose_3.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_4.Connection])
], AlbumsService);
