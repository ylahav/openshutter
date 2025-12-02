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
let AlbumsService = class AlbumsService {
    constructor(albumModel, photoModel) {
        this.albumModel = albumModel;
        this.photoModel = photoModel;
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
                    .populate('coverPhotoId')
                    .exec();
            }
            // If not found by ID, try alias
            if (!album) {
                album = yield this.albumModel
                    .findOne({ alias: idOrAlias })
                    .populate('coverPhotoId')
                    .exec();
            }
            if (!album) {
                throw new common_1.NotFoundException('Album not found');
            }
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
            const query = { albumId, isPublished: true };
            const photos = yield this.photoModel
                .find(query)
                .sort({ uploadedAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('tags')
                .populate('people')
                .populate('location')
                .exec();
            const total = yield this.photoModel.countDocuments(query);
            return {
                photos,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                },
            };
        });
    }
};
exports.AlbumsService = AlbumsService;
exports.AlbumsService = AlbumsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Album')),
    __param(1, (0, mongoose_1.InjectModel)('Photo')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], AlbumsService);
