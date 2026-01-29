import sharp from 'sharp'
import { Logger } from '@nestjs/common'

export interface ThumbnailSize {
  name: string
  width: number
  height: number
  quality: number
  folder: string
  maintainAspectRatio?: boolean
}

export interface ImageDimensions {
  width: number
  height: number
  aspectRatio: number
  orientation: 'landscape' | 'portrait' | 'square'
}

export class ThumbnailGenerator {
  private static readonly logger = new Logger(ThumbnailGenerator.name)
  
  // Define multiple thumbnail sizes for different use cases
  // All sizes maintain aspect ratio by default
  private static readonly THUMBNAIL_SIZES: ThumbnailSize[] = [
    {
      name: 'micro',
      width: 80,        // Will be scaled to maintain aspect ratio
      height: 80,       // Will be scaled to maintain aspect ratio
      quality: 60,
      folder: 'micro',
      maintainAspectRatio: true
    },
    {
      name: 'small',
      width: 200,       // Will be scaled to maintain aspect ratio
      height: 200,      // Will be scaled to maintain aspect ratio
      quality: 70,
      folder: 'small',
      maintainAspectRatio: true
    },
    {
      name: 'medium',
      width: 400,       // Will be scaled to maintain aspect ratio
      height: 400,      // Will be scaled to maintain aspect ratio
      quality: 80,
      folder: 'medium',
      maintainAspectRatio: true
    },
    {
      name: 'large',
      width: 800,       // Will be scaled to maintain aspect ratio
      height: 800,      // Will be scaled to maintain aspect ratio
      quality: 85,
      folder: 'large',
      maintainAspectRatio: true
    },
    {
      name: 'hero',
      width: 1200,      // Will be scaled to maintain aspect ratio
      height: 800,      // Will be scaled to maintain aspect ratio
      quality: 90,
      folder: 'hero',
      maintainAspectRatio: true
    }
  ]

  /**
   * Analyze image dimensions and orientation
   * Note: Sharp auto-rotates based on EXIF, so we need to get dimensions after rotation
   */
  static async analyzeImageDimensions(imageBuffer: Buffer): Promise<ImageDimensions> {
    // Get metadata first to check orientation
    const metadata = await sharp(imageBuffer).metadata()
    
    // Sharp auto-rotates images based on EXIF orientation when processing
    // To get the correct dimensions after rotation, we need to process the image
    // For portrait images with EXIF rotation, width/height may be swapped in metadata
    let width = metadata.width || 0
    let height = metadata.height || 0
    
    // If there's an orientation tag that requires rotation, swap dimensions
    // Orientation values: 1=normal, 3=180°, 6=90°CW, 8=90°CCW
    // For 6 and 8, width and height are swapped
    if (metadata.orientation) {
      if (metadata.orientation === 6 || metadata.orientation === 8) {
        // Swap width and height for 90° rotations
        [width, height] = [height, width]
      }
    }
    
    const aspectRatio = width / height

    let orientation: 'landscape' | 'portrait' | 'square'
    if (aspectRatio > 1.1) {
      orientation = 'landscape'
    } else if (aspectRatio < 0.9) {
      orientation = 'portrait'
    } else {
      orientation = 'square'
    }

    return {
      width,
      height,
      aspectRatio,
      orientation
    }
  }

  /**
   * Calculate optimal thumbnail dimensions while maintaining aspect ratio
   */
  static calculateThumbnailDimensions(
    originalDimensions: ImageDimensions,
    targetSize: ThumbnailSize
  ): { width: number; height: number } {
    if (!targetSize.maintainAspectRatio) {
      return { width: targetSize.width, height: targetSize.height }
    }

    const { width: originalWidth, height: originalHeight } = originalDimensions
    const { width: targetWidth, height: targetHeight } = targetSize

    // Calculate scale factor based on the larger dimension
    const scaleX = targetWidth / originalWidth
    const scaleY = targetHeight / originalHeight
    const scale = Math.min(scaleX, scaleY)

    return {
      width: Math.round(originalWidth * scale),
      height: Math.round(originalHeight * scale)
    }
  }

  /**
   * Generate all thumbnail sizes for an image
   */
  static async generateAllThumbnails(
    imageBuffer: Buffer,
    _baseFilename: string
  ): Promise<Record<string, Buffer>> {
    const thumbnails: Record<string, Buffer> = {}
    
    // Analyze the original image dimensions
    const imageDimensions = await this.analyzeImageDimensions(imageBuffer)

    for (const size of this.THUMBNAIL_SIZES) {
      try {
        const thumbnail = await this.generateThumbnail(imageBuffer, size, imageDimensions)
        thumbnails[size.name] = thumbnail
      } catch (error) {
        this.logger.error(`Failed to generate ${size.name} thumbnail: ${error instanceof Error ? error.message : String(error)}`)
        // Continue with other sizes even if one fails
      }
    }

    return thumbnails
  }

  /**
   * Generate a specific thumbnail size
   */
  static async generateThumbnail(
    imageBuffer: Buffer,
    size: ThumbnailSize,
    imageDimensions?: ImageDimensions
  ): Promise<Buffer> {
    // If image dimensions are provided, calculate optimal dimensions
    let resizeOptions: any = {
      fit: 'inside',
      withoutEnlargement: true,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }

    if (imageDimensions && size.maintainAspectRatio) {
      const optimalDimensions = this.calculateThumbnailDimensions(imageDimensions, size)
      resizeOptions.width = optimalDimensions.width
      resizeOptions.height = optimalDimensions.height
    } else {
      resizeOptions.width = size.width
      resizeOptions.height = size.height
    }

    // Sharp auto-rotates based on EXIF orientation by default
    // Explicitly ensure auto-rotation is enabled and strip EXIF orientation after rotation
    // This ensures the image is physically rotated and won't be rotated again by browsers
    return await sharp(imageBuffer)
      .rotate() // Auto-rotate based on EXIF orientation (default behavior, but explicit)
      .resize(resizeOptions)
      .jpeg({ 
        quality: size.quality,
        progressive: true,
        mozjpeg: true
      })
      .withMetadata({ orientation: 1 }) // Strip EXIF orientation after rotation (1 = normal orientation)
      .toBuffer()
  }

  /**
   * Generate a blur placeholder for progressive loading
   */
  static async generateBlurPlaceholder(
    imageBuffer: Buffer,
    width: number = 20,
    height: number = 20
  ): Promise<string> {
    try {
      // Analyze image dimensions to maintain aspect ratio
      const imageDimensions = await this.analyzeImageDimensions(imageBuffer)
      const optimalDimensions = this.calculateThumbnailDimensions(imageDimensions, {
        name: 'blur',
        width,
        height,
        quality: 20,
        folder: 'blur',
        maintainAspectRatio: true
      })

      const blurBuffer = await sharp(imageBuffer)
        .rotate() // Auto-rotate based on EXIF orientation
        .resize(optimalDimensions.width, optimalDimensions.height, {
          fit: 'cover'
        })
        .jpeg({ quality: 20 })
        .withMetadata({ orientation: 1 }) // Strip EXIF orientation after rotation
        .toBuffer()

      return `data:image/jpeg;base64,${blurBuffer.toString('base64')}`
    } catch (error) {
      this.logger.error(`Failed to generate blur placeholder: ${error instanceof Error ? error.message : String(error)}`)
      // Return a simple gradient as fallback
      return this.generateFallbackBlurDataURL(width, height)
    }
  }

  /**
   * Generate a fallback blur data URL
   */
  private static generateFallbackBlurDataURL(width: number, height: number): string {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, '#f3f4f6')
      gradient.addColorStop(0.5, '#e5e7eb')
      gradient.addColorStop(1, '#d1d5db')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
    }
    
    return canvas.toDataURL('image/jpeg', 0.1)
  }

  /**
   * Get the appropriate thumbnail size for a given use case
   */
  static getThumbnailSize(useCase: 'micro' | 'small' | 'medium' | 'large' | 'hero'): ThumbnailSize {
    return this.THUMBNAIL_SIZES.find(size => size.name === useCase) || this.THUMBNAIL_SIZES[2] // Default to medium
  }

  /**
   * Get all available thumbnail sizes
   */
  static getAvailableSizes(): ThumbnailSize[] {
    return [...this.THUMBNAIL_SIZES]
  }
}
