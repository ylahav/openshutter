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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlbumLeadingPhotoService = void 0;
const Album_1 = require("../models/Album");
const Photo_1 = require("../models/Photo");
const mongoose_1 = __importDefault(require("mongoose"));
class AlbumLeadingPhotoService {
    /**
     * Get the leading photo for an album using hierarchical selection:
     * 1. If album has a 'album leading photo' set, use it
     * 2. If not - use a random one from the album
     * 3. If album has no photos (only child albums) - choose the first found leading photo from child albums
     */
    static getAlbumLeadingPhoto(albumId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get the album
                const album = yield Album_1.AlbumModel.findById(albumId);
                if (!album) {
                    return { photo: null, source: 'none', albumId };
                }
                // Step 1: Check if album has a specific leading photo set
                if (album.coverPhotoId) {
                    const leadingPhoto = yield Photo_1.PhotoModel.findOne({
                        _id: album.coverPhotoId,
                        isPublished: true
                    });
                    if (leadingPhoto) {
                        return {
                            photo: leadingPhoto,
                            source: 'album-leading',
                            albumId
                        };
                    }
                }
                // Step 2: Get a random photo from the album
                const albumPhotos = yield Photo_1.PhotoModel.find({
                    albumId: albumId,
                    isPublished: true
                });
                if (albumPhotos.length > 0) {
                    // Get a random photo from the album
                    const randomIndex = Math.floor(Math.random() * albumPhotos.length);
                    const randomPhoto = albumPhotos[randomIndex];
                    return {
                        photo: randomPhoto,
                        source: 'random',
                        albumId
                    };
                }
                // Step 3: Album has no photos, look for leading photos in child albums
                const childAlbums = yield Album_1.AlbumModel.find({
                    parentAlbumId: albumId,
                    isPublic: true
                });
                if (childAlbums.length > 0) {
                    // Look for leading photos in child albums
                    for (const childAlbum of childAlbums) {
                        // First check if child album has a specific leading photo
                        if (childAlbum.coverPhotoId) {
                            const childLeadingPhoto = yield Photo_1.PhotoModel.findOne({
                                _id: childAlbum.coverPhotoId,
                                isPublished: true
                            });
                            if (childLeadingPhoto) {
                                return {
                                    photo: childLeadingPhoto,
                                    source: 'child-leading',
                                    albumId: childAlbum._id.toString()
                                };
                            }
                        }
                        // If no specific leading photo, get any photo from child album
                        const childPhotos = yield Photo_1.PhotoModel.find({
                            albumId: childAlbum._id,
                            isPublished: true
                        })
                            .limit(1);
                        if (childPhotos.length > 0) {
                            return {
                                photo: childPhotos[0],
                                source: 'child-leading',
                                albumId: childAlbum._id.toString()
                            };
                        }
                    }
                }
                // No photos found anywhere
                return { photo: null, source: 'none', albumId };
            }
            catch (error) {
                console.error('Error getting album leading photo:', error);
                return { photo: null, source: 'none', albumId };
            }
        });
    }
    /**
     * Get leading photos for multiple albums efficiently
     */
    static getMultipleAlbumLeadingPhotos(albumIds) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = new Map();
            // Process albums in parallel
            const promises = albumIds.map((albumId) => __awaiter(this, void 0, void 0, function* () {
                const result = yield this.getAlbumLeadingPhoto(albumId);
                results.set(albumId, result);
            }));
            yield Promise.all(promises);
            return results;
        });
    }
    /**
     * Get the cover image URL for an album (for use in templates)
     */
    static getAlbumCoverImageUrl(albumId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield this.getAlbumLeadingPhoto(albumId);
            if (result.photo && ((_a = result.photo.storage) === null || _a === void 0 ? void 0 : _a.url)) {
                return result.photo.storage.url;
            }
            // Fallback to site logo
            try {
                const siteConfig = yield mongoose_1.default.connection.collection('site-configs').findOne({});
                if (siteConfig && siteConfig.logo) {
                    return siteConfig.logo;
                }
            }
            catch (error) {
                console.error('Error fetching site logo:', error);
            }
            // Final fallback to placeholder
            return '/api/placeholder/400/300';
        });
    }
    /**
     * Get cover image URLs for multiple albums efficiently
     */
    static getMultipleAlbumCoverImageUrls(albumIds) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const results = new Map();
            const leadingPhotos = yield this.getMultipleAlbumLeadingPhotos(albumIds);
            // Get site logo once for all albums that need it
            let siteLogo = null;
            let hasFetchedLogo = false;
            for (const [albumId, result] of leadingPhotos) {
                if (result.photo && ((_a = result.photo.storage) === null || _a === void 0 ? void 0 : _a.url)) {
                    results.set(albumId, result.photo.storage.url);
                }
                else {
                    // Fetch site logo only once
                    if (!hasFetchedLogo) {
                        try {
                            const siteConfig = yield mongoose_1.default.connection.collection('site-configs').findOne({});
                            siteLogo = (siteConfig === null || siteConfig === void 0 ? void 0 : siteConfig.logo) || null;
                            hasFetchedLogo = true;
                        }
                        catch (error) {
                            console.error('Error fetching site logo:', error);
                            hasFetchedLogo = true;
                        }
                    }
                    results.set(albumId, siteLogo || '/api/placeholder/400/300');
                }
            }
            return results;
        });
    }
}
exports.AlbumLeadingPhotoService = AlbumLeadingPhotoService;
