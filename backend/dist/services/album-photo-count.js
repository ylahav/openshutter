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
exports.AlbumPhotoCountService = void 0;
const Album_1 = require("../models/Album");
const Photo_1 = require("../models/Photo");
class AlbumPhotoCountService {
    /**
     * Calculate total photo count for an album including all child albums recursively
     */
    static getTotalPhotoCount(albumId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get direct photos count
            const directPhotoCount = yield Photo_1.PhotoModel.countDocuments({
                albumId: albumId,
                isPublished: true
            });
            // Get child albums
            const childAlbums = yield Album_1.AlbumModel.find({
                parentAlbumId: albumId,
                isPublic: true
            }).select({
                _id: 1,
                name: 1,
                alias: 1,
                photoCount: 1
            });
            // Calculate total photo count from child albums recursively
            let totalChildPhotoCount = 0;
            const childAlbumsWithCounts = [];
            for (const childAlbum of childAlbums) {
                const childResult = yield this.getTotalPhotoCount(childAlbum._id);
                totalChildPhotoCount += childResult.totalPhotoCount;
                childAlbumsWithCounts.push({
                    _id: childAlbum._id.toString(),
                    name: childAlbum.name,
                    alias: childAlbum.alias,
                    photoCount: childResult.totalPhotoCount
                });
            }
            const totalPhotoCount = directPhotoCount + totalChildPhotoCount;
            return {
                directPhotoCount,
                childAlbumCount: childAlbums.length,
                totalPhotoCount,
                childAlbums: childAlbumsWithCounts
            };
        });
    }
    /**
     * Get photo count for multiple albums (useful for homepage statistics)
     */
    static getAlbumsPhotoCounts(albumIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = new Map();
            yield Promise.all(albumIds.map((albumId) => __awaiter(this, void 0, void 0, function* () {
                const result = yield this.getTotalPhotoCount(albumId);
                const id = typeof albumId === 'string' ? albumId : albumId.toString();
                results.set(id, result.totalPhotoCount);
            })));
            return results;
        });
    }
}
exports.AlbumPhotoCountService = AlbumPhotoCountService;
