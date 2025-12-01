import sharp from 'sharp'

export interface CompressionConfig {
  quality: number
  progressive: boolean
  mozjpeg: boolean
  webp: boolean
  avif: boolean
  maxWidth?: number
  maxHeight?: number
}

export interface CompressionResult {
  original: Buffer
  compressed: Buffer
  webp?: Buffer
  avif?: Buffer
  compressionRatio: number
  sizeReduction: number
}

export class ImageCompressionService {
  // Compression configurations for different use cases
  private static readonly COMPRESSION_CONFIGS: Record<string, CompressionConfig> = {
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
  }

  /**
   * Compress an image with multiple format outputs
   */
  static async compressImage(
    imageBuffer: Buffer,
    configType: keyof typeof ImageCompressionService.COMPRESSION_CONFIGS = 'gallery'
  ): Promise<CompressionResult> {
    const config = this.COMPRESSION_CONFIGS[configType]
    const originalSize = imageBuffer.length

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata()
    const { width: originalWidth, height: originalHeight } = metadata

    // Calculate optimal dimensions
    const dimensions = this.calculateOptimalDimensions(
      originalWidth || 0,
      originalHeight || 0,
      config.maxWidth,
      config.maxHeight
    )

    // Compress JPEG
    const compressedJpeg = await sharp(imageBuffer)
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
      .toBuffer()

    const result: CompressionResult = {
      original: imageBuffer,
      compressed: compressedJpeg,
      compressionRatio: compressedJpeg.length / originalSize,
      sizeReduction: ((originalSize - compressedJpeg.length) / originalSize) * 100
    }

    // Generate WebP if enabled
    if (config.webp) {
      result.webp = await sharp(imageBuffer)
        .resize(dimensions.width, dimensions.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({
          quality: config.quality
        })
        .toBuffer()
    }

    // Generate AVIF if enabled
    if (config.avif) {
      result.avif = await sharp(imageBuffer)
        .resize(dimensions.width, dimensions.height, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .avif({
          quality: config.quality
        })
        .toBuffer()
    }

    return result
  }

  /**
   * Calculate optimal dimensions while maintaining aspect ratio
   */
  private static calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth?: number,
    maxHeight?: number
  ): { width: number; height: number } {
    if (!maxWidth && !maxHeight) {
      return { width: originalWidth, height: originalHeight }
    }

    const aspectRatio = originalWidth / originalHeight
    let width = originalWidth
    let height = originalHeight

    if (maxWidth && maxHeight) {
      // Scale to fit within both constraints
      const scaleX = maxWidth / originalWidth
      const scaleY = maxHeight / originalHeight
      const scale = Math.min(scaleX, scaleY)
      
      width = Math.round(originalWidth * scale)
      height = Math.round(originalHeight * scale)
    } else if (maxWidth) {
      // Scale to fit width
      width = maxWidth
      height = Math.round(maxWidth / aspectRatio)
    } else if (maxHeight) {
      // Scale to fit height
      height = maxHeight
      width = Math.round(maxHeight * aspectRatio)
    }

    return { width, height }
  }

  /**
   * Get the best format for a given client
   */
  static getBestFormat(
    acceptHeader: string | null,
    availableFormats: string[]
  ): string {
    if (!acceptHeader) {
      return 'jpeg'
    }

    const accepts = acceptHeader.toLowerCase()
    
    // Check for AVIF support (best compression)
    if (accepts.includes('image/avif') && availableFormats.includes('avif')) {
      return 'avif'
    }
    
    // Check for WebP support (good compression)
    if (accepts.includes('image/webp') && availableFormats.includes('webp')) {
      return 'webp'
    }
    
    // Fallback to JPEG
    return 'jpeg'
  }

  /**
   * Compress multiple images in parallel
   */
  static async compressImages(
    images: Array<{ buffer: Buffer; configType?: keyof typeof ImageCompressionService.COMPRESSION_CONFIGS }>
  ): Promise<CompressionResult[]> {
    return Promise.all(
      images.map(({ buffer, configType = 'gallery' }) =>
        this.compressImage(buffer, configType)
      )
    )
  }

  /**
   * Get compression statistics
   */
  static getCompressionStats(results: CompressionResult[]): {
    totalOriginalSize: number
    totalCompressedSize: number
    averageCompressionRatio: number
    averageSizeReduction: number
    totalSavings: number
  } {
    const totalOriginalSize = results.reduce((sum, result) => sum + result.original.length, 0)
    const totalCompressedSize = results.reduce((sum, result) => sum + result.compressed.length, 0)
    const averageCompressionRatio = results.reduce((sum, result) => sum + result.compressionRatio, 0) / results.length
    const averageSizeReduction = results.reduce((sum, result) => sum + result.sizeReduction, 0) / results.length
    const totalSavings = totalOriginalSize - totalCompressedSize

    return {
      totalOriginalSize,
      totalCompressedSize,
      averageCompressionRatio,
      averageSizeReduction,
      totalSavings
    }
  }

  /**
   * Optimize image for web delivery
   */
  static async optimizeForWeb(
    imageBuffer: Buffer,
    targetSize?: number // Target file size in bytes
  ): Promise<Buffer> {
    let quality = 85
    let result = await sharp(imageBuffer)
      .jpeg({ quality, progressive: true, mozjpeg: true })
      .toBuffer()

    // If target size is specified, adjust quality to meet it
    if (targetSize && result.length > targetSize) {
      quality = Math.max(20, quality - 10) // Don't go below 20% quality
      
      result = await sharp(imageBuffer)
        .jpeg({ quality, progressive: true, mozjpeg: true })
        .toBuffer()
    }

    return result
  }
}
