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
exports.ImageCompressionService = void 0;
const sharp_1 = __importDefault(require("sharp"));
class ImageCompressionService {
    /**
     * Compress an image with multiple format outputs
     */
    static compressImage(imageBuffer_1) {
        return __awaiter(this, arguments, void 0, function* (imageBuffer, configType = 'gallery') {
            const config = this.COMPRESSION_CONFIGS[configType];
            const originalSize = imageBuffer.length;
            // Get image metadata
            const metadata = yield (0, sharp_1.default)(imageBuffer).metadata();
            const { width: originalWidth, height: originalHeight } = metadata;
            // Calculate optimal dimensions
            const dimensions = this.calculateOptimalDimensions(originalWidth || 0, originalHeight || 0, config.maxWidth, config.maxHeight);
            // Compress JPEG
            const compressedJpeg = yield (0, sharp_1.default)(imageBuffer)
                .resize(dimensions.width, dimensions.height, {
                fit: 'inside',
                withoutEnlargement: true
            })
                // Preserve existing EXIF metadata from the source image
                .withMetadata()
                .jpeg({
                quality: config.quality,
                progressive: config.progressive,
                mozjpeg: config.mozjpeg
            })
                .toBuffer();
            const result = {
                original: imageBuffer,
                compressed: compressedJpeg,
                compressionRatio: compressedJpeg.length / originalSize,
                sizeReduction: ((originalSize - compressedJpeg.length) / originalSize) * 100
            };
            // Generate WebP if enabled
            if (config.webp) {
                result.webp = yield (0, sharp_1.default)(imageBuffer)
                    .resize(dimensions.width, dimensions.height, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .webp({
                    quality: config.quality
                })
                    .toBuffer();
            }
            // Generate AVIF if enabled
            if (config.avif) {
                result.avif = yield (0, sharp_1.default)(imageBuffer)
                    .resize(dimensions.width, dimensions.height, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                    .avif({
                    quality: config.quality
                })
                    .toBuffer();
            }
            return result;
        });
    }
    /**
     * Calculate optimal dimensions while maintaining aspect ratio
     */
    static calculateOptimalDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
        if (!maxWidth && !maxHeight) {
            return { width: originalWidth, height: originalHeight };
        }
        const aspectRatio = originalWidth / originalHeight;
        let width = originalWidth;
        let height = originalHeight;
        if (maxWidth && maxHeight) {
            // Scale to fit within both constraints
            const scaleX = maxWidth / originalWidth;
            const scaleY = maxHeight / originalHeight;
            const scale = Math.min(scaleX, scaleY);
            width = Math.round(originalWidth * scale);
            height = Math.round(originalHeight * scale);
        }
        else if (maxWidth) {
            // Scale to fit width
            width = maxWidth;
            height = Math.round(maxWidth / aspectRatio);
        }
        else if (maxHeight) {
            // Scale to fit height
            height = maxHeight;
            width = Math.round(maxHeight * aspectRatio);
        }
        return { width, height };
    }
    /**
     * Get the best format for a given client
     */
    static getBestFormat(acceptHeader, availableFormats) {
        if (!acceptHeader) {
            return 'jpeg';
        }
        const accepts = acceptHeader.toLowerCase();
        // Check for AVIF support (best compression)
        if (accepts.includes('image/avif') && availableFormats.includes('avif')) {
            return 'avif';
        }
        // Check for WebP support (good compression)
        if (accepts.includes('image/webp') && availableFormats.includes('webp')) {
            return 'webp';
        }
        // Fallback to JPEG
        return 'jpeg';
    }
    /**
     * Compress multiple images in parallel
     */
    static compressImages(images) {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.all(images.map(({ buffer, configType = 'gallery' }) => this.compressImage(buffer, configType)));
        });
    }
    /**
     * Get compression statistics
     */
    static getCompressionStats(results) {
        const totalOriginalSize = results.reduce((sum, result) => sum + result.original.length, 0);
        const totalCompressedSize = results.reduce((sum, result) => sum + result.compressed.length, 0);
        const averageCompressionRatio = results.reduce((sum, result) => sum + result.compressionRatio, 0) / results.length;
        const averageSizeReduction = results.reduce((sum, result) => sum + result.sizeReduction, 0) / results.length;
        const totalSavings = totalOriginalSize - totalCompressedSize;
        return {
            totalOriginalSize,
            totalCompressedSize,
            averageCompressionRatio,
            averageSizeReduction,
            totalSavings
        };
    }
    /**
     * Optimize image for web delivery
     */
    static optimizeForWeb(imageBuffer, targetSize // Target file size in bytes
    ) {
        return __awaiter(this, void 0, void 0, function* () {
            let quality = 85;
            let result = yield (0, sharp_1.default)(imageBuffer)
                .jpeg({ quality, progressive: true, mozjpeg: true })
                .toBuffer();
            // If target size is specified, adjust quality to meet it
            if (targetSize && result.length > targetSize) {
                quality = Math.max(20, quality - 10); // Don't go below 20% quality
                result = yield (0, sharp_1.default)(imageBuffer)
                    .jpeg({ quality, progressive: true, mozjpeg: true })
                    .toBuffer();
            }
            return result;
        });
    }
}
exports.ImageCompressionService = ImageCompressionService;
// Compression configurations for different use cases
ImageCompressionService.COMPRESSION_CONFIGS = {
    // High quality for hero images
    hero: {
        quality: 90,
        progressive: true,
        mozjpeg: true,
        webp: true,
        avif: true,
        maxWidth: 1920,
        maxHeight: 1080
    },
    // Medium quality for gallery images
    gallery: {
        quality: 85,
        progressive: true,
        mozjpeg: true,
        webp: true,
        avif: true,
        maxWidth: 1200,
        maxHeight: 800
    },
    // Lower quality for thumbnails
    thumbnail: {
        quality: 80,
        progressive: true,
        mozjpeg: true,
        webp: true,
        avif: false, // AVIF not needed for small thumbnails
        maxWidth: 400,
        maxHeight: 400
    },
    // High compression for mobile
    mobile: {
        quality: 75,
        progressive: true,
        mozjpeg: true,
        webp: true,
        avif: true,
        maxWidth: 800,
        maxHeight: 600
    },
    // Maximum compression for bandwidth-limited scenarios
    bandwidth: {
        quality: 65,
        progressive: true,
        mozjpeg: true,
        webp: true,
        avif: true,
        maxWidth: 600,
        maxHeight: 400
    }
};
