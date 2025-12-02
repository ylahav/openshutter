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
exports.PhotoUploadService = void 0;
const common_1 = require("@nestjs/common");
const sharp_1 = __importDefault(require("sharp"));
const manager_1 = require("./storage/manager");
const mongoose_1 = __importStar(require("mongoose"));
const thumbnail_generator_1 = require("./thumbnail-generator");
const image_compression_1 = require("./image-compression");
const { ObjectId } = mongoose_1.Types;
let PhotoUploadService = class PhotoUploadService {
    uploadPhoto(fileBuffer_1, originalFilename_1, mimeType_1) {
        return __awaiter(this, arguments, void 0, function* (fileBuffer, originalFilename, mimeType, options = {}) {
            try {
                const db = mongoose_1.default.connection.db;
                if (!db) {
                    throw new Error('Database connection not established');
                }
                // Ensure photos collection exists and indexes are created
                yield this.ensurePhotosCollection(db);
                // Get album information if albumId is provided
                let album = null;
                let storageProvider = options.storageProvider || 'local';
                if (options.albumId) {
                    try {
                        const objectId = new ObjectId(options.albumId);
                        album = yield db.collection('albums').findOne({ _id: objectId });
                    }
                    catch (_a) {
                        album = null;
                    }
                    if (album && album.storageProvider) {
                        storageProvider = album.storageProvider;
                    }
                }
                // Get storage service from the new storage manager
                console.log(`PhotoUploadService: Getting storage service for provider: ${storageProvider}`);
                const storageService = yield manager_1.storageManager.getProvider(storageProvider);
                console.log(`PhotoUploadService: Storage service obtained:`, storageService.constructor.name);
                // Generate unique filename
                const timestamp = Date.now();
                const extension = originalFilename.split('.').pop();
                const filename = `${timestamp}-${originalFilename}`;
                // Use album path if it exists (folders should be created when album is created)
                let albumPath = '';
                if (album && album.storagePath) {
                    albumPath = album.storagePath;
                }
                // Compress original image for web delivery
                const compressionResult = yield image_compression_1.ImageCompressionService.compressImage(fileBuffer, 'gallery');
                // Upload compressed original file
                console.log(`PhotoUploadService: Uploading file ${filename} to path: ${albumPath}`);
                const uploadResult = yield storageService.uploadFile(compressionResult.compressed, filename, mimeType, albumPath, {
                    originalFilename,
                    albumId: options.albumId,
                    tags: options.tags,
                    description: options.description || ''
                });
                console.log(`PhotoUploadService: Upload result:`, uploadResult);
                // Generate multiple thumbnails
                const thumbnailBuffers = yield thumbnail_generator_1.ThumbnailGenerator.generateAllThumbnails(fileBuffer, filename);
                const thumbnails = {};
                // Upload each thumbnail size
                for (const [sizeName, buffer] of Object.entries(thumbnailBuffers)) {
                    try {
                        const sizeConfig = thumbnail_generator_1.ThumbnailGenerator.getThumbnailSize(sizeName);
                        const thumbnailFilename = `${sizeName}-${filename}`;
                        // Create size-specific folder
                        let sizeFolderPath = albumPath;
                        if (albumPath) {
                            try {
                                yield storageService.createFolder(sizeConfig.folder, albumPath);
                                sizeFolderPath = `${albumPath}/${sizeConfig.folder}`;
                            }
                            catch (error) {
                                console.warn(`PhotoUploadService: Failed to create ${sizeConfig.folder} folder:`, error);
                            }
                        }
                        // Upload thumbnail
                        const thumbnailResult = yield storageService.uploadFile(buffer, thumbnailFilename, 'image/jpeg', sizeFolderPath, { originalFile: filename, size: sizeName });
                        thumbnails[sizeName] = `/api/storage/serve/${storageProvider}/${encodeURIComponent(thumbnailResult.path)}`;
                    }
                    catch (error) {
                        console.warn(`PhotoUploadService: Failed to upload ${sizeName} thumbnail:`, error);
                    }
                }
                // Generate blur placeholder for progressive loading
                const blurDataURL = yield thumbnail_generator_1.ThumbnailGenerator.generateBlurPlaceholder(fileBuffer);
                // Keep the original thumbnail for backward compatibility
                const mediumThumbnail = thumbnails.medium || thumbnails.small || Object.values(thumbnails)[0];
                // Extract EXIF data (use comprehensive extractor)
                const { ExifExtractor } = yield Promise.resolve().then(() => __importStar(require('./exif-extractor')));
                const exifData = yield ExifExtractor.extractExifData(fileBuffer);
                // Get image dimensions
                const imageInfo = yield (0, sharp_1.default)(fileBuffer).metadata();
                const dimensions = {
                    width: imageInfo.width || 0,
                    height: imageInfo.height || 0
                };
                // Resolve uploader ObjectId (fallback to real system user if not provided)
                let uploaderObjectId;
                if (options.uploadedBy) {
                    uploaderObjectId = new ObjectId(options.uploadedBy);
                }
                else {
                    try {
                        const systemUser = yield db.collection('users').findOne({ username: 'system' });
                        uploaderObjectId = (systemUser === null || systemUser === void 0 ? void 0 : systemUser._id) || new ObjectId('000000000000000000000000');
                    }
                    catch (_b) {
                        uploaderObjectId = new ObjectId('000000000000000000000000');
                    }
                }
                // Prepare photo data for database
                const photoData = {
                    title: { en: options.title || originalFilename },
                    description: { en: options.description || '' },
                    filename,
                    originalFilename,
                    mimeType,
                    size: compressionResult.compressed.length,
                    originalSize: fileBuffer.length,
                    compressionRatio: compressionResult.compressionRatio,
                    dimensions,
                    storage: {
                        provider: storageProvider,
                        fileId: uploadResult.fileId,
                        url: `/api/storage/serve/${storageProvider}/${encodeURIComponent(uploadResult.path)}`,
                        path: uploadResult.path,
                        thumbnailPath: mediumThumbnail,
                        thumbnails: thumbnails,
                        blurDataURL: blurDataURL,
                        folderId: uploadResult.folderId
                    },
                    albumId: options.albumId ? new ObjectId(options.albumId) : null,
                    tags: options.tags || [],
                    isPublished: true,
                    isLeading: false,
                    uploadedBy: uploaderObjectId,
                    uploadedAt: new Date(),
                    updatedAt: new Date(),
                    exif: exifData
                };
                // Save to database (native driver)
                const photosCollection = db.collection('photos');
                const insertResult = yield photosCollection.insertOne(photoData);
                const savedPhoto = Object.assign({ _id: insertResult.insertedId }, photoData);
                // Update album photo count if album exists
                if (options.albumId) {
                    try {
                        yield db.collection('albums').updateOne({ _id: new ObjectId(options.albumId) }, { $inc: { photoCount: 1 } });
                    }
                    catch (e) {
                        console.warn('Failed to update album photo count:', e);
                    }
                }
                return {
                    success: true,
                    photo: savedPhoto,
                    thumbnailPath: mediumThumbnail,
                    thumbnails: thumbnails,
                    blurDataURL: blurDataURL,
                    exifData
                };
            }
            catch (error) {
                console.error('Photo upload failed:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Upload failed'
                };
            }
        });
    }
    static generateThumbnail(imageBuffer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield (0, sharp_1.default)(imageBuffer)
                    .resize(this.THUMBNAIL_WIDTH, this.THUMBNAIL_HEIGHT, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .jpeg({ quality: this.THUMBNAIL_QUALITY })
                    .toBuffer();
            }
            catch (error) {
                console.error('Thumbnail generation failed:', error);
                throw new Error('Failed to generate thumbnail');
            }
        });
    }
    static extractExifData(imageBuffer) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const ExifParser = require('exif-parser');
                const parser = ExifParser.create(imageBuffer);
                const result = parser.parse();
                if (!result.tags) {
                    return null;
                }
                // Extract relevant EXIF data
                const exifData = {};
                // Camera information
                if (result.tags.Make)
                    exifData.make = result.tags.Make;
                if (result.tags.Model)
                    exifData.model = result.tags.Model;
                // Date and time
                if (result.tags.DateTime) {
                    exifData.dateTime = new Date(result.tags.DateTime);
                }
                // Camera settings
                if (result.tags.ExposureTime)
                    exifData.exposureTime = result.tags.ExposureTime;
                if (result.tags.FNumber)
                    exifData.fNumber = result.tags.FNumber;
                if (result.tags.ISO)
                    exifData.iso = result.tags.ISO;
                if (result.tags.FocalLength)
                    exifData.focalLength = result.tags.FocalLength;
                // GPS information
                if (result.tags.GPSLatitude && result.tags.GPSLongitude) {
                    exifData.gps = {
                        latitude: result.tags.GPSLatitude,
                        longitude: result.tags.GPSLongitude
                    };
                    if (result.tags.GPSAltitude) {
                        exifData.gps.altitude = result.tags.GPSAltitude;
                    }
                }
                // Software and copyright
                if (result.tags.Software)
                    exifData.software = result.tags.Software;
                if (result.tags.Copyright)
                    exifData.copyright = result.tags.Copyright;
                return Object.keys(exifData).length > 0 ? exifData : null;
            }
            catch (error) {
                console.warn('Failed to extract EXIF data:', error);
                return null;
            }
        });
    }
    // Folder creation is handled when albums are created, not during photo upload
    ensurePhotosCollection(db) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const existing = yield db.listCollections({ name: 'photos' }).toArray();
                if (existing.length === 0) {
                    yield db.createCollection('photos');
                    try {
                        yield db.collection('photos').createIndex({ albumId: 1 });
                        yield db.collection('photos').createIndex({ uploadedBy: 1 });
                        yield db.collection('photos').createIndex({ isPublished: 1 });
                        yield db.collection('photos').createIndex({ tags: 1 });
                        yield db.collection('photos').createIndex({ uploadedAt: -1 });
                        yield db.collection('photos').createIndex({ filename: 1 }, { unique: true });
                    }
                    catch (e) {
                        console.warn('Index creation warning:', e);
                    }
                }
            }
            catch (e) {
                console.warn('Failed to ensure photos collection:', e);
            }
        });
    }
};
exports.PhotoUploadService = PhotoUploadService;
PhotoUploadService.THUMBNAIL_WIDTH = 300;
PhotoUploadService.THUMBNAIL_HEIGHT = 300;
PhotoUploadService.THUMBNAIL_QUALITY = 80;
exports.PhotoUploadService = PhotoUploadService = __decorate([
    (0, common_1.Injectable)()
], PhotoUploadService);
