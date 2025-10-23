import { storageConfigService } from './config'
import { 
  IStorageManager, 
  IStorageService, 
  StorageProviderId, 
  StorageUploadResult, 
  StorageFolderResult, 
  StorageFileInfo, 
  StorageFolderInfo,
  StorageError,
  StorageConfigError,
  StorageConnectionError,
  StorageOperationError
} from './types'
import { LocalStorageService } from './providers/local'
import { GoogleDriveService } from './providers/google-drive'
import { AwsS3Service } from './providers/aws-s3'
import { BackblazeService } from './providers/backblaze'
import { WasabiService } from './providers/wasabi'

export class StorageManager implements IStorageManager {
  private static instance: StorageManager
  private serviceCache: Map<StorageProviderId, IStorageService> = new Map()

  private constructor() {}

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager()
    }
    return StorageManager.instance
  }

  /**
   * Get storage service for a specific provider
   */
  async getProvider(providerId: StorageProviderId): Promise<IStorageService> {
    // Check cache first
    if (this.serviceCache.has(providerId)) {
      return this.serviceCache.get(providerId)!
    }

    // Validate provider is enabled
    const isEnabled = await storageConfigService.isProviderEnabled(providerId)
    if (!isEnabled) {
      throw new StorageConfigError(`Provider ${providerId} is not enabled`, providerId)
    }

    // Get provider configuration
    const config = await storageConfigService.getConfig(providerId)
    
    // Create service instance
    const service = this.createService(providerId, config.config)
    
    // Cache the service
    this.serviceCache.set(providerId, service)
    
    return service
  }

  /**
   * Get all active storage providers
   */
  async getActiveProviders(): Promise<StorageProviderId[]> {
    return await storageConfigService.getActiveProviders()
  }

  /**
   * Validate a storage provider
   */
  async validateProvider(providerId: StorageProviderId): Promise<boolean> {
    try {
      const service = await this.getProvider(providerId)
      return await service.validateConnection()
    } catch (error) {
      console.error(`Failed to validate provider ${providerId}:`, error)
      return false
    }
  }

  /**
   * Create album folder
   */
  async createAlbum(
    albumName: string, 
    albumAlias: string, 
    providerId: StorageProviderId, 
    parentPath?: string
  ): Promise<StorageFolderResult> {
    try {
      const service = await this.getProvider(providerId)
      const albumPath = parentPath ? `${parentPath}/${albumAlias}` : albumAlias
      
      return await service.createFolder(albumAlias, parentPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to create album ${albumName}`,
        providerId,
        'createAlbum',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Delete album folder
   */
  async deleteAlbum(albumPath: string, providerId: StorageProviderId): Promise<void> {
    try {
      const service = await this.getProvider(providerId)
      await service.deleteFolder(albumPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to delete album ${albumPath}`,
        providerId,
        'deleteAlbum',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Get album information
   */
  async getAlbumInfo(albumPath: string, providerId: StorageProviderId): Promise<StorageFolderInfo> {
    try {
      const service = await this.getProvider(providerId)
      return await service.getFolderInfo(albumPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to get album info for ${albumPath}`,
        providerId,
        'getAlbumInfo',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Upload photo to album
   */
  async uploadPhoto(
    file: Buffer,
    filename: string,
    mimeType: string,
    albumPath: string,
    providerId: StorageProviderId,
    metadata?: Record<string, any>
  ): Promise<StorageUploadResult> {
    try {
      const service = await this.getProvider(providerId)
      return await service.uploadFile(file, filename, mimeType, albumPath, metadata)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to upload photo ${filename}`,
        providerId,
        'uploadPhoto',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Upload buffer to storage
   */
  async uploadBuffer(
    buffer: Buffer,
    filePath: string,
    providerId: StorageProviderId,
    mimeType?: string
  ): Promise<StorageUploadResult> {
    try {
      const service = await this.getProvider(providerId)
      const filename = filePath.split('/').pop() || 'file'
      const folderPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : undefined
      const detectedMimeType = mimeType || this.getMimeTypeFromFilename(filename)
      
      return await service.uploadFile(buffer, filename, detectedMimeType, folderPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to upload buffer to ${filePath}`,
        providerId,
        'uploadBuffer',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Get MIME type from filename
   */
  private getMimeTypeFromFilename(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'txt': 'text/plain'
    }
    return mimeTypes[extension || ''] || 'application/octet-stream'
  }

  /**
   * Delete photo
   */
  async deletePhoto(photoPath: string, providerId: StorageProviderId): Promise<void> {
    try {
      const service = await this.getProvider(providerId)
      await service.deleteFile(photoPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to delete photo ${photoPath}`,
        providerId,
        'deletePhoto',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Get photo information
   */
  async getPhotoInfo(photoPath: string, providerId: StorageProviderId): Promise<StorageFileInfo> {
    try {
      const service = await this.getProvider(providerId)
      return await service.getFileInfo(photoPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to get photo info for ${photoPath}`,
        providerId,
        'getPhotoInfo',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * List photos in album
   */
  async listAlbumPhotos(albumPath: string, providerId: StorageProviderId): Promise<StorageFileInfo[]> {
    try {
      const service = await this.getProvider(providerId)
      return await service.listFiles(albumPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to list photos in album ${albumPath}`,
        providerId,
        'listAlbumPhotos',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Get photo URL
   */
  async getPhotoUrl(photoPath: string, providerId: StorageProviderId): Promise<string> {
    try {
      const service = await this.getProvider(providerId)
      return service.getFileUrl(photoPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to get photo URL for ${photoPath}`,
        providerId,
        'getPhotoUrl',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Get album URL
   */
  async getAlbumUrl(albumPath: string, providerId: StorageProviderId): Promise<string> {
    try {
      const service = await this.getProvider(providerId)
      return service.getFolderUrl(albumPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to get album URL for ${albumPath}`,
        providerId,
        'getAlbumUrl',
        error instanceof Error ? error : undefined
      )
    }
  }

  /**
   * Get photo buffer for serving
   */
  async getPhotoBuffer(providerId: StorageProviderId, photoPath: string): Promise<Buffer | null> {
    try {
      const service = await this.getProvider(providerId)
      return await service.getFileBuffer(photoPath)
    } catch (error) {
      console.error(`Failed to get photo buffer for ${photoPath}:`, error)
      return null
    }
  }



  /**
   * Create storage service instance based on provider type
   */
  private createService(providerId: StorageProviderId, config: Record<string, any>): IStorageService {
    switch (providerId) {
      case 'local':
        return new LocalStorageService(config)
      case 'google-drive':
        // Flatten the nested config structure for Google Drive
        const flattenedConfig = {
          ...config,
          // Extract nested config properties to top level
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          refreshToken: config.refreshToken,
          folderId: config.folderId,
          isEnabled: config.isEnabled
        }
        return new GoogleDriveService(flattenedConfig)
      case 'aws-s3':
        // Flatten the nested config structure for AWS S3
        const flattenedS3Config = {
          ...config,
          // Extract nested config properties to top level
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          region: config.region,
          bucketName: config.bucketName,
          isEnabled: config.isEnabled
        }
        return new AwsS3Service(flattenedS3Config)
      case 'backblaze':
        // Flatten the nested config structure for Backblaze
        const flattenedBackblazeConfig = {
          ...config,
          // Extract nested config properties to top level
          applicationKeyId: config.applicationKeyId,
          applicationKey: config.applicationKey,
          bucketName: config.bucketName,
          region: config.region,
          isEnabled: config.isEnabled
        }
        return new BackblazeService(flattenedBackblazeConfig)
      case 'wasabi':
        // Flatten the nested config structure for Wasabi
        const flattenedWasabiConfig = {
          ...config,
          // Extract nested config properties to top level
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          bucketName: config.bucketName,
          region: config.region,
          endpoint: config.endpoint,
          isEnabled: config.isEnabled
        }
        return new WasabiService(flattenedWasabiConfig)
      default:
        throw new StorageConfigError(`Unsupported storage provider: ${providerId}`, providerId)
    }
  }

  /**
   * Clear service cache
   */
  clearCache(): void {
    this.serviceCache.clear()
  }

  /**
   * Remove specific provider from cache
   */
  removeFromCache(providerId: StorageProviderId): void {
    this.serviceCache.delete(providerId)
  }
}

// Export singleton instance
export const storageManager = StorageManager.getInstance()
