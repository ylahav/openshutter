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
exports.DatabaseOptimizer = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const query_monitor_1 = require("./query-monitor");
class DatabaseOptimizer {
    /**
     * Optimized album query with photos and metadata in single aggregation
     */
    static getAlbumsWithMetadata(parentId_1) {
        return __awaiter(this, arguments, void 0, function* (parentId, options = {}) {
            const endQuery = query_monitor_1.QueryMonitor.startQuery('getAlbumsWithMetadata');
            const db = mongoose_1.default.connection.db;
            if (!db)
                throw new Error('Database connection not established');
            // First get the albums
            const matchStage = {};
            if (parentId === 'root' || parentId === null) {
                matchStage.parentAlbumId = null;
            }
            else if (parentId) {
                matchStage.$or = [
                    { parentAlbumId: new mongoose_1.Types.ObjectId(parentId) },
                    { parentAlbumId: parentId }
                ];
            }
            const albums = yield db.collection('albums')
                .find(matchStage)
                .sort({ level: 1, order: 1, name: 1 })
                .toArray();
            // Then get photo counts and cover photos for each album
            const albumsWithMetadata = yield Promise.all(albums.map((album) => __awaiter(this, void 0, void 0, function* () {
                // Get photo count using the same logic as the working photos API
                const photoCount = yield db.collection('photos').countDocuments({
                    $or: [
                        { albumId: album._id },
                        { albumId: album._id.toString() }
                    ],
                    isPublished: true
                });
                // Get cover photo
                const coverPhoto = yield db.collection('photos')
                    .findOne({
                    $or: [
                        { albumId: album._id },
                        { albumId: album._id.toString() }
                    ],
                    isPublished: true
                }, {
                    projection: { _id: 1, filename: 1, storage: 1, uploadedAt: 1 }
                });
                // Get child album count
                const childAlbumCount = yield db.collection('albums').countDocuments({
                    $or: [
                        { parentAlbumId: album._id },
                        { parentAlbumId: album._id.toString() }
                    ],
                    isPublic: true
                });
                return Object.assign(Object.assign({}, album), { photoCount,
                    childAlbumCount, coverPhotoId: coverPhoto === null || coverPhoto === void 0 ? void 0 : coverPhoto._id, coverPhoto });
            })));
            try {
                endQuery(albumsWithMetadata.length, false);
                return albumsWithMetadata;
            }
            catch (error) {
                endQuery(0, false, error instanceof Error ? error.message : 'Unknown error');
                throw error;
            }
        });
    }
    /**
     * Optimized photo query with album metadata
     */
    static getPhotosWithAlbumData(albumId_1) {
        return __awaiter(this, arguments, void 0, function* (albumId, options = {}) {
            const db = mongoose_1.default.connection.db;
            if (!db)
                throw new Error('Database connection not established');
            const pipeline = [
                {
                    $match: {
                        $or: [
                            { albumId: new mongoose_1.Types.ObjectId(albumId) },
                            { albumId: albumId }
                        ],
                        isPublished: true
                    }
                },
                {
                    $lookup: {
                        from: 'albums',
                        localField: 'albumId',
                        foreignField: '_id',
                        as: 'album',
                        pipeline: [
                            { $project: { name: 1, alias: 1, isPublic: 1 } }
                        ]
                    }
                },
                {
                    $addFields: {
                        albumName: { $arrayElemAt: ['$album.name', 0] },
                        albumAlias: { $arrayElemAt: ['$album.alias', 0] }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        title: 1,
                        description: 1,
                        filename: 1,
                        originalFilename: 1,
                        mimeType: 1,
                        size: 1,
                        dimensions: 1,
                        storage: 1,
                        tags: 1,
                        exif: 1,
                        albumName: 1,
                        albumAlias: 1,
                        uploadedAt: 1,
                        updatedAt: 1
                    }
                },
                { $sort: { uploadedAt: -1 } }
            ];
            if (options.limit) {
                pipeline.push({ $limit: options.limit });
            }
            if (options.skip) {
                pipeline.push({ $skip: options.skip });
            }
            return yield db.collection('photos').aggregate(pipeline).toArray();
        });
    }
    /**
     * Batch query for multiple albums with photos
     */
    static getBatchAlbumsWithPhotos(albumIds_1) {
        return __awaiter(this, arguments, void 0, function* (albumIds, options = {}) {
            const db = mongoose_1.default.connection.db;
            if (!db)
                throw new Error('Database connection not established');
            const objectIds = albumIds.map(id => new mongoose_1.Types.ObjectId(id));
            const pipeline = [
                {
                    $match: {
                        _id: { $in: objectIds }
                    }
                },
                {
                    $lookup: {
                        from: 'photos',
                        localField: '_id',
                        foreignField: 'albumId',
                        as: 'photos',
                        pipeline: [
                            { $match: { isPublished: true } },
                            { $project: { _id: 1, filename: 1, storage: 1, uploadedAt: 1 } },
                            { $sort: { uploadedAt: -1 } },
                            { $limit: 5 } // Get top 5 photos for preview
                        ]
                    }
                },
                {
                    $lookup: {
                        from: 'photos',
                        localField: '_id',
                        foreignField: 'albumId',
                        as: 'photoCount',
                        pipeline: [
                            { $match: { isPublished: true } },
                            { $count: 'count' }
                        ]
                    }
                },
                {
                    $addFields: {
                        coverPhoto: { $arrayElemAt: ['$photos', 0] },
                        photoCount: { $arrayElemAt: ['$photoCount.count', 0] }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        name: 1,
                        alias: 1,
                        description: 1,
                        isPublic: 1,
                        coverPhoto: 1,
                        photoCount: { $ifNull: ['$photoCount', 0] },
                        photos: 1
                    }
                }
            ];
            const results = yield db.collection('albums').aggregate(pipeline).toArray();
            // Convert to key-value object for easy lookup
            const resultMap = {};
            results.forEach(album => {
                resultMap[album._id.toString()] = album;
            });
            return resultMap;
        });
    }
    /**
     * Optimized search with full-text indexing
     */
    static searchPhotos(query_1) {
        return __awaiter(this, arguments, void 0, function* (query, filters = {}, options = {}) {
            const db = mongoose_1.default.connection.db;
            if (!db)
                throw new Error('Database connection not established');
            const matchStage = { isPublished: true };
            // Album filter
            if (filters.albumId) {
                matchStage.albumId = { $in: [new mongoose_1.Types.ObjectId(filters.albumId), filters.albumId] };
            }
            // Tags filter
            if (filters.tags && filters.tags.length > 0) {
                matchStage.tags = { $in: filters.tags };
            }
            // Date range filter
            if (filters.dateRange) {
                matchStage.uploadedAt = {
                    $gte: filters.dateRange.start,
                    $lte: filters.dateRange.end
                };
            }
            // Build language-aware conditions synchronously
            let textMatchAfterLookups = null;
            if (query) {
                const { SUPPORTED_LANGUAGES } = yield Promise.resolve().then(() => __importStar(require('../types/multi-lang')));
                const langs = SUPPORTED_LANGUAGES.map(l => l.code);
                const titleDescConds = ['title', 'description']
                    .flatMap(f => langs.map(code => ({ [`${f}.${code}`]: { $regex: query, $options: 'i' } })));
                const fileConds = [
                    { filename: { $regex: query, $options: 'i' } },
                    { originalFilename: { $regex: query, $options: 'i' } }
                ];
                // If photos store people as plain string names, match directly on array
                const peopleArrayRegex = { people: { $regex: query, $options: 'i' } };
                const peopleConds = [].concat(...(['fullName', 'firstName', 'lastName', 'nickname'].map(f => langs.map(code => ({ [`peopleDocs.${f}.${code}`]: { $regex: query, $options: 'i' } })))), ['fullName', 'firstName', 'lastName', 'nickname'].map(f => ({ [`peopleDocs.${f}`]: { $regex: query, $options: 'i' } })));
                textMatchAfterLookups = { $or: [...titleDescConds, ...fileConds, peopleArrayRegex, ...peopleConds] };
            }
            const pipeline = [
                { $match: matchStage },
                {
                    $lookup: {
                        from: 'albums',
                        localField: 'albumId',
                        foreignField: '_id',
                        as: 'album',
                        pipeline: [
                            { $project: { name: 1, alias: 1 } }
                        ]
                    }
                },
                // Normalize people to ObjectIds and join
                {
                    $addFields: {
                        peopleObjectIds: {
                            $map: {
                                input: { $ifNull: ['$people', []] },
                                as: 'p',
                                in: {
                                    $cond: [
                                        { $eq: [{ $type: '$$p' }, 'objectId'] },
                                        '$$p',
                                        {
                                            $convert: { input: '$$p', to: 'objectId', onError: null, onNull: null }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'people',
                        localField: 'peopleObjectIds',
                        foreignField: '_id',
                        as: 'peopleDocs',
                        pipeline: [
                            { $project: { fullName: 1, firstName: 1, lastName: 1, nickname: 1 } }
                        ]
                    }
                },
                ...(textMatchAfterLookups ? [{ $match: textMatchAfterLookups }] : []),
                {
                    $addFields: {
                        albumName: { $arrayElemAt: ['$album.name', 0] },
                        albumAlias: { $arrayElemAt: ['$album.alias', 0] }
                    }
                },
                { $sort: { uploadedAt: -1 } }
            ];
            if (options.limit) {
                pipeline.push({ $limit: options.limit });
            }
            if (options.skip) {
                pipeline.push({ $skip: options.skip });
            }
            return yield db.collection('photos').aggregate(pipeline).toArray();
        });
    }
    /**
     * Get paginated results with cursor-based pagination
     */
    static getPaginatedResults(collection_1) {
        return __awaiter(this, arguments, void 0, function* (collection, query = {}, options = {}) {
            const db = mongoose_1.default.connection.db;
            if (!db)
                throw new Error('Database connection not established');
            const { cursor, sortField = '_id', sortDirection = -1, limit = 20, projection } = options;
            let matchQuery = Object.assign({}, query);
            // Add cursor-based pagination
            if (cursor) {
                const cursorValue = sortField === '_id' ? new mongoose_1.Types.ObjectId(cursor) : cursor;
                matchQuery[sortField] = sortDirection === -1
                    ? { $lt: cursorValue }
                    : { $gt: cursorValue };
            }
            const pipeline = [{ $match: matchQuery }];
            if (projection) {
                pipeline.push({ $project: projection });
            }
            pipeline.push({ $sort: { [sortField]: sortDirection } });
            pipeline.push({ $limit: limit + 1 }); // Get one extra to check if there are more
            const results = yield db.collection(collection).aggregate(pipeline).toArray();
            const hasMore = results.length > limit;
            const data = hasMore ? results.slice(0, limit) : results;
            const nextCursor = hasMore && data.length > 0
                ? data[data.length - 1][sortField].toString()
                : undefined;
            return {
                data: data,
                totalCount: data.length,
                hasMore,
                nextCursor
            };
        });
    }
    /**
     * Create optimized indexes for common queries
     */
    static createOptimizedIndexes() {
        return __awaiter(this, void 0, void 0, function* () {
            const db = mongoose_1.default.connection.db;
            if (!db)
                throw new Error('Database connection not established');
            // Albums collection indexes
            yield db.collection('albums').createIndexes([
                { key: { parentAlbumId: 1, order: 1 } },
                { key: { level: 1, isPublic: 1 } },
                { key: { isFeatured: 1, isPublic: 1 } },
                { key: { createdAt: -1 } },
                { key: { updatedAt: -1 } }
            ]);
            // Photos collection indexes
            yield db.collection('photos').createIndexes([
                { key: { albumId: 1, isPublished: 1 } },
                { key: { uploadedAt: -1, isPublished: 1 } },
                { key: { tags: 1, isPublished: 1 } },
                { key: { uploadedBy: 1 } },
                { key: { 'storage.provider': 1 } },
                { key: { title: 'text', description: 'text', tags: 'text' } } // Text search index
            ]);
            // Blog articles indexes
            yield db.collection('blogarticles').createIndexes([
                { key: { authorId: 1, isPublished: 1 } },
                { key: { category: 1, isPublished: 1 } },
                { key: { tags: 1, isPublished: 1 } },
                { key: { publishedAt: -1, isPublished: 1 } },
                { key: { title: 'text', content: 'text' } } // Text search index
            ]);
            console.log('✅ Optimized database indexes created successfully');
        });
    }
    /**
     * Get database performance statistics
     */
    static getPerformanceStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const db = mongoose_1.default.connection.db;
            if (!db)
                throw new Error('Database connection not established');
            const stats = yield db.stats();
            const collections = yield db.listCollections().toArray();
            const collectionStats = yield Promise.all(collections.map((collection) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const collStats = yield db.collection(collection.name).stats();
                    return {
                        name: collection.name,
                        count: collStats.count || 0,
                        size: collStats.size || 0,
                        avgObjSize: collStats.avgObjSize || 0,
                        indexes: collStats.nindexes || 0,
                        totalIndexSize: collStats.totalIndexSize || 0
                    };
                }
                catch (error) {
                    console.warn(`Failed to get stats for collection ${collection.name}:`, error);
                    return {
                        name: collection.name,
                        count: 0,
                        size: 0,
                        avgObjSize: 0,
                        indexes: 0,
                        totalIndexSize: 0
                    };
                }
            })));
            return {
                database: {
                    name: stats.db,
                    collections: stats.collections,
                    dataSize: stats.dataSize,
                    storageSize: stats.storageSize,
                    indexSize: stats.indexSize,
                    totalSize: stats.dataSize + stats.indexSize
                },
                collections: collectionStats
            };
        });
    }
}
exports.DatabaseOptimizer = DatabaseOptimizer;
