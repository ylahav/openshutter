import { Logger } from '@nestjs/common'
import { storageConfigService } from './config'
import { ownerStorageConfigService } from './owner-storage-config.service'
import type { StorageOwnerContext } from './types'
import { UserModel } from '../../models/User'
import {
  IStorageManager,
  IStorageService,
  StorageProviderId,
  StorageUploadResult,
  StorageFolderResult,
  StorageFileInfo,
  StorageFolderInfo,
  StorageConfigError,
  StorageOperationError,
} from './types'
import { LocalStorageService } from './providers/local'
import { GoogleDriveService } from './providers/google-drive'
import { AwsS3Service } from './providers/aws-s3'
import { BackblazeService } from './providers/backblaze'
import { WasabiService } from './providers/wasabi'

export class StorageManager implements IStorageManager {
  private readonly logger = new Logger(StorageManager.name)
  private static instance: StorageManager
  private serviceCache: Map<StorageProviderId, IStorageService> = new Map()
  /** Key: `o:${ownerUserId}:${providerId}` */
  private ownerServiceCache: Map<string, IStorageService> = new Map()

  private constructor() {}

  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager()
    }
    return StorageManager.instance
  }

  private ownerCacheKey(ownerId: string, providerId: StorageProviderId): string {
    return `o:${ownerId}:${providerId}`
  }

  clearOwnerCache(ownerId: string): void {
    for (const k of [...this.ownerServiceCache.keys()]) {
      if (k.startsWith(`o:${ownerId}:`)) {
        this.ownerServiceCache.delete(k)
      }
    }
  }

  private async getOwnerDedicatedService(
    providerId: StorageProviderId,
    ctx: StorageOwnerContext,
    forServe: boolean,
  ): Promise<IStorageService> {
    const key = this.ownerCacheKey(ctx.ownerUserId, providerId)
    if (this.ownerServiceCache.has(key)) {
      return this.ownerServiceCache.get(key)!
    }

    const user = await UserModel.findById(ctx.ownerUserId).select('useDedicatedStorage').lean()
    if (!user || !(user as any).useDedicatedStorage) {
      throw new StorageConfigError('Dedicated storage is not enabled for this owner', providerId)
    }

    const row = await ownerStorageConfigService.get(ctx.ownerUserId, providerId)
    if (!row) {
      throw new StorageConfigError(
        `No dedicated storage configuration for provider "${providerId}". Add it under Owner → Storage or Admin → User.`,
        providerId,
      )
    }
    if (!forServe && row.isEnabled === false) {
      throw new StorageConfigError(`Provider ${providerId} is disabled for this owner`, providerId)
    }

    const service = this.createService(providerId, row.config)
    this.ownerServiceCache.set(key, service)
    return service
  }

  private async resolveService(
    providerId: StorageProviderId,
    ctx: StorageOwnerContext | undefined,
    forServe: boolean,
  ): Promise<IStorageService> {
    if (ctx?.ownerUserId) {
      return this.getOwnerDedicatedService(providerId, ctx, forServe)
    }
    if (forServe) {
      return this.getProviderForServeGlobal(providerId)
    }
    return this.getProviderGlobal(providerId)
  }

  private async getProviderGlobal(providerId: StorageProviderId): Promise<IStorageService> {
    if (this.serviceCache.has(providerId)) {
      return this.serviceCache.get(providerId)!
    }

    const isEnabled = await storageConfigService.isProviderEnabled(providerId)
    if (!isEnabled) {
      throw new StorageConfigError(`Provider ${providerId} is not enabled`, providerId)
    }

    const config = await storageConfigService.getConfig(providerId)
    const service = this.createService(providerId, config.config)
    this.serviceCache.set(providerId, service)
    return service
  }

  private async getProviderForServeGlobal(providerId: StorageProviderId): Promise<IStorageService> {
    const config = await storageConfigService.getConfig(providerId)
    return this.createService(providerId, config.config)
  }

  async getProvider(providerId: StorageProviderId, ctx?: StorageOwnerContext): Promise<IStorageService> {
    return this.resolveService(providerId, ctx, false)
  }

  async getProviderForServe(providerId: StorageProviderId, ctx?: StorageOwnerContext): Promise<IStorageService> {
    return this.resolveService(providerId, ctx, true)
  }

  async getActiveProviders(): Promise<StorageProviderId[]> {
    return await storageConfigService.getActiveProviders()
  }

  async validateProvider(providerId: StorageProviderId, ctx?: StorageOwnerContext): Promise<boolean> {
    try {
      const service = await this.getProvider(providerId, ctx)
      return await service.validateConnection()
    } catch (error) {
      this.logger.error(
        `Failed to validate provider ${providerId}: ${error instanceof Error ? error.message : String(error)}`,
      )
      return false
    }
  }

  async createAlbum(
    albumName: string,
    albumAlias: string,
    providerId: StorageProviderId,
    parentPath?: string,
    ctx?: StorageOwnerContext,
  ): Promise<StorageFolderResult> {
    try {
      const service = await this.getProvider(providerId, ctx)
      return await service.createFolder(albumAlias, parentPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to create album ${albumName}`,
        providerId,
        'createAlbum',
        error instanceof Error ? error : undefined,
      )
    }
  }

  async deleteAlbum(albumPath: string, providerId: StorageProviderId, ctx?: StorageOwnerContext): Promise<void> {
    try {
      const service = await this.getProvider(providerId, ctx)
      await service.deleteFolder(albumPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to delete album ${albumPath}`,
        providerId,
        'deleteAlbum',
        error instanceof Error ? error : undefined,
      )
    }
  }

  async getAlbumInfo(albumPath: string, providerId: StorageProviderId, ctx?: StorageOwnerContext): Promise<StorageFolderInfo> {
    try {
      const service = await this.getProvider(providerId, ctx)
      return await service.getFolderInfo(albumPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to get album info for ${albumPath}`,
        providerId,
        'getAlbumInfo',
        error instanceof Error ? error : undefined,
      )
    }
  }

  async uploadPhoto(
    file: Buffer,
    filename: string,
    mimeType: string,
    albumPath: string,
    providerId: StorageProviderId,
    metadata?: Record<string, any>,
    ctx?: StorageOwnerContext,
  ): Promise<StorageUploadResult> {
    try {
      const service = await this.getProvider(providerId, ctx)
      return await service.uploadFile(file, filename, mimeType, albumPath, metadata)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to upload photo ${filename}`,
        providerId,
        'uploadPhoto',
        error instanceof Error ? error : undefined,
      )
    }
  }

  async uploadBuffer(
    buffer: Buffer,
    filePath: string,
    providerId: StorageProviderId,
    mimeType?: string,
    ctx?: StorageOwnerContext,
  ): Promise<StorageUploadResult> {
    try {
      const service = await this.getProvider(providerId, ctx)
      const filename = filePath.split('/').pop() || 'file'
      const folderPath = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : undefined
      const detectedMimeType = mimeType || this.getMimeTypeFromFilename(filename)

      return await service.uploadFile(buffer, filename, detectedMimeType, folderPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to upload buffer to ${filePath}`,
        providerId,
        'uploadBuffer',
        error instanceof Error ? error : undefined,
      )
    }
  }

  private getMimeTypeFromFilename(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      pdf: 'application/pdf',
      txt: 'text/plain',
    }
    return mimeTypes[extension || ''] || 'application/octet-stream'
  }

  async deletePhoto(photoPath: string, providerId: StorageProviderId, ctx?: StorageOwnerContext): Promise<void> {
    try {
      const service = await this.getProvider(providerId, ctx)
      await service.deleteFile(photoPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to delete photo ${photoPath}`,
        providerId,
        'deletePhoto',
        error instanceof Error ? error : undefined,
      )
    }
  }

  async getPhotoInfo(photoPath: string, providerId: StorageProviderId, ctx?: StorageOwnerContext): Promise<StorageFileInfo> {
    try {
      const service = await this.getProvider(providerId, ctx)
      return await service.getFileInfo(photoPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to get photo info for ${photoPath}`,
        providerId,
        'getPhotoInfo',
        error instanceof Error ? error : undefined,
      )
    }
  }

  async listAlbumPhotos(albumPath: string, providerId: StorageProviderId, ctx?: StorageOwnerContext): Promise<StorageFileInfo[]> {
    try {
      const service = await this.getProvider(providerId, ctx)
      return await service.listFiles(albumPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to list photos in album ${albumPath}`,
        providerId,
        'listAlbumPhotos',
        error instanceof Error ? error : undefined,
      )
    }
  }

  async getPhotoUrl(photoPath: string, providerId: StorageProviderId, ctx?: StorageOwnerContext): Promise<string> {
    try {
      const service = await this.getProvider(providerId, ctx)
      return service.getFileUrl(photoPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to get photo URL for ${photoPath}`,
        providerId,
        'getPhotoUrl',
        error instanceof Error ? error : undefined,
      )
    }
  }

  async getAlbumUrl(albumPath: string, providerId: StorageProviderId, ctx?: StorageOwnerContext): Promise<string> {
    try {
      const service = await this.getProvider(providerId, ctx)
      return service.getFolderUrl(albumPath)
    } catch (error) {
      throw new StorageOperationError(
        `Failed to get album URL for ${albumPath}`,
        providerId,
        'getAlbumUrl',
        error instanceof Error ? error : undefined,
      )
    }
  }

  async getPhotoBuffer(
    providerId: StorageProviderId,
    photoPath: string,
    ctx?: StorageOwnerContext,
  ): Promise<Buffer | null> {
    try {
      const service = await this.resolveService(providerId, ctx, true)
      return await service.getFileBuffer(photoPath)
    } catch (error) {
      this.logger.error(
        `Failed to get photo buffer for ${photoPath}: ${error instanceof Error ? error.message : String(error)}`,
      )
      return null
    }
  }

  private createService(providerId: StorageProviderId, config: Record<string, any>): IStorageService {
    switch (providerId) {
      case 'local':
        return new LocalStorageService(config)
      case 'google-drive':
        const flattenedConfig = {
          ...config,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          refreshToken: config.refreshToken,
          redirectUri: config.redirectUri,
          folderId: config.folderId,
          authMethod: config.authMethod || 'oauth',
          serviceAccountJson: config.serviceAccountJson,
          client_email: config.client_email,
          private_key: config.private_key,
          storageType: config.storageType,
          isEnabled: config.isEnabled,
        }
        return new GoogleDriveService(flattenedConfig)
      case 'aws-s3':
        const flattenedS3Config = {
          ...config,
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          region: config.region,
          bucketName: config.bucketName,
          isEnabled: config.isEnabled,
        }
        return new AwsS3Service(flattenedS3Config)
      case 'backblaze':
        const flattenedBackblazeConfig = {
          ...config,
          applicationKeyId: config.applicationKeyId,
          applicationKey: config.applicationKey,
          bucketName: config.bucketName,
          region: config.region,
          isEnabled: config.isEnabled,
        }
        return new BackblazeService(flattenedBackblazeConfig)
      case 'wasabi':
        const flattenedWasabiConfig = {
          ...config,
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
          bucketName: config.bucketName,
          region: config.region,
          endpoint: config.endpoint,
          isEnabled: config.isEnabled,
        }
        return new WasabiService(flattenedWasabiConfig)
      default:
        throw new StorageConfigError(`Unsupported storage provider: ${providerId}`, providerId)
    }
  }

  clearCache(): void {
    this.serviceCache.clear()
  }

  removeFromCache(providerId: StorageProviderId): void {
    this.serviceCache.delete(providerId)
  }
}

export const storageManager = StorageManager.getInstance()
