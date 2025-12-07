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
exports.AlbumLeadingPhotoService = void 0;
const Album_1 = require("../models/Album");
const Photo_1 = require("../models/Photo");
const site_config_1 = require("./site-config");
class AlbumLeadingPhotoService {
    /**
     * Get the leading photo for an album using hierarchical selection:
     * 1. Find album's photo with isLeading === true and show it
     * 2. If not found - go to all sub-albums (if exist) and try for each of them to find a leading photo... the first who found - show it
     * 3. If not found - show site logo (handled by getAlbumCoverImageUrl)
     */
    static getAlbumLeadingPhoto(albumId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get the album
                const album = yield Album_1.AlbumModel.findById(albumId);
                if (!album) {
                    return { photo: null, source: 'none', albumId };
                }
                // Step 1: Find album's photo with isLeading === true
                const leadingPhoto = yield Photo_1.PhotoModel.findOne({
                    albumId: albumId,
                    isLeading: true,
                    isPublished: true
                });
                if (leadingPhoto) {
                    return {
                        photo: leadingPhoto,
                        source: 'is-leading',
                        albumId
                    };
                }
                // Step 2: If not found, go to all sub-albums and try to find a leading photo
                const childAlbums = yield Album_1.AlbumModel.find({
                    parentAlbumId: albumId,
                    isPublic: true
                });
                if (childAlbums.length > 0) {
                    // Look for leading photos in child albums
                    for (const childAlbum of childAlbums) {
                        // Find photos with isLeading === true in child album
                        const childLeadingPhoto = yield Photo_1.PhotoModel.findOne({
                            albumId: childAlbum._id,
                            isLeading: true,
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
                }
                // No leading photos found anywhere
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
     * Returns the leading photo URL, or site logo if no leading photo found
     */
    static getAlbumCoverImageUrl(albumId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield this.getAlbumLeadingPhoto(albumId);
            if (result.photo && ((_a = result.photo.storage) === null || _a === void 0 ? void 0 : _a.url)) {
                return result.photo.storage.url;
            }
            // Step 3: Fallback to site logo
            try {
                const siteConfig = yield site_config_1.siteConfigService.getConfig();
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
                            const siteConfig = yield site_config_1.siteConfigService.getConfig();
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
