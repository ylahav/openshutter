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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("../common/guards/admin.guard");
const db_1 = require("../config/db");
const mongoose_1 = __importDefault(require("mongoose"));
let AnalyticsController = class AnalyticsController {
    /**
     * Get analytics statistics
     * Path: GET /api/admin/analytics
     */
    getAnalytics() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, db_1.connectDB)();
                const db = mongoose_1.default.connection.db;
                if (!db)
                    throw new Error('Database connection not established');
                // Get counts for all collections
                const [totalPhotos, publishedPhotos, totalAlbums, publicAlbums, totalUsers, activeUsers, totalTags, activeTags, totalLocations, activeLocations, totalPeople, activePeople, totalGroups, totalPages, publishedPages, totalBlogCategories, activeBlogCategories,] = yield Promise.all([
                    db.collection('photos').countDocuments({}),
                    db.collection('photos').countDocuments({ isPublished: true }),
                    db.collection('albums').countDocuments({}),
                    db.collection('albums').countDocuments({ isPublic: true }),
                    db.collection('users').countDocuments({}),
                    db.collection('users').countDocuments({ blocked: { $ne: true } }),
                    db.collection('tags').countDocuments({}),
                    db.collection('tags').countDocuments({ isActive: true }),
                    db.collection('locations').countDocuments({}),
                    db.collection('locations').countDocuments({ isActive: true }),
                    db.collection('people').countDocuments({}),
                    db.collection('people').countDocuments({ isActive: true }),
                    db.collection('groups').countDocuments({}),
                    db.collection('pages').countDocuments({}),
                    db.collection('pages').countDocuments({ isPublished: true }),
                    db.collection('blogcategories').countDocuments({}),
                    db.collection('blogcategories').countDocuments({ isActive: true }),
                ]);
                // Get storage statistics (approximate)
                const photos = yield db
                    .collection('photos')
                    .find({}, { projection: { fileSize: 1 } })
                    .toArray();
                const totalStorageBytes = photos.reduce((sum, photo) => sum + (photo.fileSize || 0), 0);
                const totalStorageMB = Math.round((totalStorageBytes / (1024 * 1024)) * 100) / 100;
                const totalStorageGB = Math.round((totalStorageBytes / (1024 * 1024 * 1024)) * 100) / 100;
                // Get recent activity (last 30 days)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const [recentPhotos, recentAlbums, recentUsers,] = yield Promise.all([
                    db.collection('photos').countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
                    db.collection('albums').countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
                    db.collection('users').countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
                ]);
                // Get top albums by photo count
                const albumsWithCounts = yield db
                    .collection('albums')
                    .aggregate([
                    {
                        $lookup: {
                            from: 'photos',
                            localField: '_id',
                            foreignField: 'albumId',
                            as: 'photos',
                        },
                    },
                    {
                        $project: {
                            name: 1,
                            alias: 1,
                            photoCount: { $size: '$photos' },
                            isPublic: 1,
                        },
                    },
                    {
                        $sort: { photoCount: -1 },
                    },
                    {
                        $limit: 10,
                    },
                ])
                    .toArray();
                // Get top tags by usage
                const tagsWithUsage = yield db
                    .collection('tags')
                    .find({}, { projection: { name: 1, usageCount: 1, isActive: 1 } })
                    .sort({ usageCount: -1 })
                    .limit(10)
                    .toArray();
                return {
                    overview: {
                        photos: {
                            total: totalPhotos,
                            published: publishedPhotos,
                            draft: totalPhotos - publishedPhotos,
                        },
                        albums: {
                            total: totalAlbums,
                            public: publicAlbums,
                            private: totalAlbums - publicAlbums,
                        },
                        users: {
                            total: totalUsers,
                            active: activeUsers,
                            blocked: totalUsers - activeUsers,
                        },
                        tags: {
                            total: totalTags,
                            active: activeTags,
                            inactive: totalTags - activeTags,
                        },
                        locations: {
                            total: totalLocations,
                            active: activeLocations,
                            inactive: totalLocations - activeLocations,
                        },
                        people: {
                            total: totalPeople,
                            active: activePeople,
                            inactive: totalPeople - activePeople,
                        },
                        groups: {
                            total: totalGroups,
                        },
                        pages: {
                            total: totalPages,
                            published: publishedPages,
                            draft: totalPages - publishedPages,
                        },
                        blogCategories: {
                            total: totalBlogCategories,
                            active: activeBlogCategories,
                            inactive: totalBlogCategories - activeBlogCategories,
                        },
                    },
                    storage: {
                        totalBytes: totalStorageBytes,
                        totalMB: totalStorageMB,
                        totalGB: totalStorageGB,
                        formatted: totalStorageGB >= 1 ? `${totalStorageGB} GB` : `${totalStorageMB} MB`,
                    },
                    recentActivity: {
                        photos: recentPhotos,
                        albums: recentAlbums,
                        users: recentUsers,
                        period: '30 days',
                    },
                    topAlbums: albumsWithCounts.map((album) => ({
                        _id: album._id.toString(),
                        name: album.name,
                        alias: album.alias,
                        photoCount: album.photoCount || 0,
                        isPublic: album.isPublic,
                    })),
                    topTags: tagsWithUsage.map((tag) => ({
                        _id: tag._id.toString(),
                        name: tag.name,
                        usageCount: tag.usageCount || 0,
                        isActive: tag.isActive,
                    })),
                };
            }
            catch (error) {
                console.error('Error fetching analytics:', error);
                throw new Error(`Failed to fetch analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getAnalytics", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)('admin/analytics'),
    (0, common_1.UseGuards)(admin_guard_1.AdminGuard)
], AnalyticsController);
