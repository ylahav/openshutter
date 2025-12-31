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
exports.ThumbnailGenerator = void 0;
const sharp_1 = __importDefault(require("sharp"));
class ThumbnailGenerator {
    /**
     * Analyze image dimensions and orientation
     */
    static analyzeImageDimensions(imageBuffer) {
        return __awaiter(this, void 0, void 0, function* () {
            const metadata = yield (0, sharp_1.default)(imageBuffer).metadata();
            const width = metadata.width || 0;
            const height = metadata.height || 0;
            const aspectRatio = width / height;
            let orientation;
            if (aspectRatio > 1.1) {
                orientation = 'landscape';
            }
            else if (aspectRatio < 0.9) {
                orientation = 'portrait';
            }
            else {
                orientation = 'square';
            }
            return {
                width,
                height,
                aspectRatio,
                orientation
            };
        });
    }
    /**
     * Calculate optimal thumbnail dimensions while maintaining aspect ratio
     */
    static calculateThumbnailDimensions(originalDimensions, targetSize) {
        if (!targetSize.maintainAspectRatio) {
            return { width: targetSize.width, height: targetSize.height };
        }
        const { width: originalWidth, height: originalHeight } = originalDimensions;
        const { width: targetWidth, height: targetHeight } = targetSize;
        // Calculate scale factor based on the larger dimension
        const scaleX = targetWidth / originalWidth;
        const scaleY = targetHeight / originalHeight;
        const scale = Math.min(scaleX, scaleY);
        return {
            width: Math.round(originalWidth * scale),
            height: Math.round(originalHeight * scale)
        };
    }
    /**
     * Generate all thumbnail sizes for an image
     */
    static generateAllThumbnails(imageBuffer, _baseFilename) {
        return __awaiter(this, void 0, void 0, function* () {
            const thumbnails = {};
            // Analyze the original image dimensions
            const imageDimensions = yield this.analyzeImageDimensions(imageBuffer);
            for (const size of this.THUMBNAIL_SIZES) {
                try {
                    const thumbnail = yield this.generateThumbnail(imageBuffer, size, imageDimensions);
                    thumbnails[size.name] = thumbnail;
                }
                catch (error) {
                    console.error(`Failed to generate ${size.name} thumbnail:`, error);
                    // Continue with other sizes even if one fails
                }
            }
            return thumbnails;
        });
    }
    /**
     * Generate a specific thumbnail size
     */
    static generateThumbnail(imageBuffer, size, imageDimensions) {
        return __awaiter(this, void 0, void 0, function* () {
            // If image dimensions are provided, calculate optimal dimensions
            let resizeOptions = {
                fit: 'inside',
                withoutEnlargement: true,
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            };
            if (imageDimensions && size.maintainAspectRatio) {
                const optimalDimensions = this.calculateThumbnailDimensions(imageDimensions, size);
                resizeOptions.width = optimalDimensions.width;
                resizeOptions.height = optimalDimensions.height;
            }
            else {
                resizeOptions.width = size.width;
                resizeOptions.height = size.height;
            }
            return yield (0, sharp_1.default)(imageBuffer)
                .resize(resizeOptions)
                .jpeg({
                quality: size.quality,
                progressive: true,
                mozjpeg: true
            })
                .toBuffer();
        });
    }
    /**
     * Generate a blur placeholder for progressive loading
     */
    static generateBlurPlaceholder(imageBuffer_1) {
        return __awaiter(this, arguments, void 0, function* (imageBuffer, width = 20, height = 20) {
            try {
                // Analyze image dimensions to maintain aspect ratio
                const imageDimensions = yield this.analyzeImageDimensions(imageBuffer);
                const optimalDimensions = this.calculateThumbnailDimensions(imageDimensions, {
                    name: 'blur',
                    width,
                    height,
                    quality: 20,
                    folder: 'blur',
                    maintainAspectRatio: true
                });
                const blurBuffer = yield (0, sharp_1.default)(imageBuffer)
                    .resize(optimalDimensions.width, optimalDimensions.height, {
                    fit: 'cover'
                })
                    .jpeg({ quality: 20 })
                    .toBuffer();
                return `data:image/jpeg;base64,${blurBuffer.toString('base64')}`;
            }
            catch (error) {
                console.error('Failed to generate blur placeholder:', error);
                // Return a simple gradient as fallback
                return this.generateFallbackBlurDataURL(width, height);
            }
        });
    }
    /**
     * Generate a fallback blur data URL
     */
    static generateFallbackBlurDataURL(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, '#f3f4f6');
            gradient.addColorStop(0.5, '#e5e7eb');
            gradient.addColorStop(1, '#d1d5db');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        }
        return canvas.toDataURL('image/jpeg', 0.1);
    }
    /**
     * Get the appropriate thumbnail size for a given use case
     */
    static getThumbnailSize(useCase) {
        return this.THUMBNAIL_SIZES.find(size => size.name === useCase) || this.THUMBNAIL_SIZES[2]; // Default to medium
    }
    /**
     * Get all available thumbnail sizes
     */
    static getAvailableSizes() {
        return [...this.THUMBNAIL_SIZES];
    }
}
exports.ThumbnailGenerator = ThumbnailGenerator;
// Define multiple thumbnail sizes for different use cases
// All sizes maintain aspect ratio by default
ThumbnailGenerator.THUMBNAIL_SIZES = [
    {
        name: 'micro',
        width: 80, // Will be scaled to maintain aspect ratio
        height: 80, // Will be scaled to maintain aspect ratio
        quality: 60,
        folder: 'micro',
        maintainAspectRatio: true
    },
    {
        name: 'small',
        width: 200, // Will be scaled to maintain aspect ratio
        height: 200, // Will be scaled to maintain aspect ratio
        quality: 70,
        folder: 'small',
        maintainAspectRatio: true
    },
    {
        name: 'medium',
        width: 400, // Will be scaled to maintain aspect ratio
        height: 400, // Will be scaled to maintain aspect ratio
        quality: 80,
        folder: 'medium',
        maintainAspectRatio: true
    },
    {
        name: 'large',
        width: 800, // Will be scaled to maintain aspect ratio
        height: 800, // Will be scaled to maintain aspect ratio
        quality: 85,
        folder: 'large',
        maintainAspectRatio: true
    },
    {
        name: 'hero',
        width: 1200, // Will be scaled to maintain aspect ratio
        height: 800, // Will be scaled to maintain aspect ratio
        quality: 90,
        folder: 'hero',
        maintainAspectRatio: true
    }
];
