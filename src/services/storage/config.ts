import { connectToDatabase } from '@/lib/mongodb'
import { BaseStorageConfig, StorageProviderId, StorageConfigError } from './types'

export class StorageConfigService {
  private static instance: StorageConfigService
  private configCache: Map<StorageProviderId, BaseStorageConfig> = new Map()
  private cacheExpiry: number = 5 * 60 * 1000 // 5 minutes
  private lastCacheUpdate: number = 0

  private constructor() {}

  static getInstance(): StorageConfigService {
    if (!StorageConfigService.instance) {
      StorageConfigService.instance = new StorageConfigService()
    }
    return StorageConfigService.instance
  }

  /**
   * Get all storage configurations
   */
  async getAllConfigs(): Promise<BaseStorageConfig[]> {
    await this.refreshCacheIfNeeded()
    return Array.from(this.configCache.values())
  }

  /**
   * Get configuration for a specific provider
   */
  async getConfig(providerId: StorageProviderId): Promise<BaseStorageConfig> {
    await this.refreshCacheIfNeeded()
    const config = this.configCache.get(providerId)
    
    if (!config) {
      throw new StorageConfigError(`Configuration not found for provider: ${providerId}`, providerId)
    }
    
    return config
  }

  /**
   * Get active storage providers
   */
  async getActiveProviders(): Promise<StorageProviderId[]> {
    await this.refreshCacheIfNeeded()
    return Array.from(this.configCache.values())
      .filter(config => config.isEnabled)
      .map(config => config.providerId)
  }

  /**
   * Check if a provider is enabled
   */
  async isProviderEnabled(providerId: StorageProviderId): Promise<boolean> {
    try {
      const config = await this.getConfig(providerId)
      return config.isEnabled
    } catch (error) {
      return false
    }
  }

  /**
   * Update storage configuration
   */
  async updateConfig(providerId: StorageProviderId, updates: Partial<BaseStorageConfig>): Promise<void> {
    const { db } = await connectToDatabase()
    const collection = db.collection('storage_configs')
    
    const updateData = {
      ...updates,
      updatedAt: new Date()
    }
    
    const result = await collection.updateOne(
      { providerId },
      { $set: updateData }
    )
    
    if (result.matchedCount === 0) {
      throw new StorageConfigError(`Provider configuration not found: ${providerId}`, providerId)
    }
    
    // Invalidate cache
    this.invalidateCache()
  }

  /**
   * Create or update multiple configurations
   */
  async upsertConfigs(configs: Partial<BaseStorageConfig>[]): Promise<void> {
    const { db } = await connectToDatabase()
    const collection = db.collection('storage_configs')
    
    const operations = configs.map(config => ({
      updateOne: {
        filter: { providerId: config.providerId },
        update: {
          $set: {
            ...config,
            updatedAt: new Date()
          }
        },
        upsert: true
      }
    }))
    
    await collection.bulkWrite(operations)
    
    // Invalidate cache
    this.invalidateCache()
  }

  /**
   * Initialize default configurations if they don't exist
   */
  async initializeDefaultConfigs(): Promise<void> {
    const { db } = await connectToDatabase()
    const collection = db.collection('storage_configs')
    
    const defaultConfigs = [
      {
        providerId: 'google-drive' as StorageProviderId,
        name: 'Google Drive',
        isEnabled: false,
        config: {
          clientId: '',
          clientSecret: '',
          refreshToken: '',
          folderId: '',
          isEnabled: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        providerId: 'aws-s3' as StorageProviderId,
        name: 'Amazon S3',
        isEnabled: false,
        config: {
          accessKeyId: '',
          secretAccessKey: '',
          region: 'us-east-1',
          bucketName: '',
          isEnabled: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        providerId: 'local' as StorageProviderId,
        name: 'Local Storage',
        isEnabled: false,
        config: {
          basePath: process.env.LOCAL_STORAGE_PATH || './uploads',
          maxFileSize: '100MB',
          isEnabled: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
    
    // Check which configs already exist
    const existingConfigs = await collection.find({}).toArray()
    const existingProviderIds = existingConfigs.map(config => config.providerId)
    
    const configsToInsert = defaultConfigs.filter(
      config => !existingProviderIds.includes(config.providerId)
    )
    
    if (configsToInsert.length > 0) {
      await collection.insertMany(configsToInsert)
      this.invalidateCache()
    }
  }

  /**
   * Validate configuration for a provider
   */
  async validateConfig(providerId: StorageProviderId): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const config = await this.getConfig(providerId)
      const errors: string[] = []
      
      if (!config.isEnabled) {
        errors.push('Provider is not enabled')
      }
      
      // Provider-specific validation
      switch (providerId) {
        case 'google-drive':
          if (!config.config.clientId) errors.push('Client ID is required')
          if (!config.config.clientSecret) errors.push('Client Secret is required')
          if (!config.config.refreshToken) errors.push('Refresh Token is required')
          break
          
        case 'aws-s3':
          if (!config.config.accessKeyId) errors.push('Access Key ID is required')
          if (!config.config.secretAccessKey) errors.push('Secret Access Key is required')
          if (!config.config.bucketName) errors.push('Bucket Name is required')
          break
          
        case 'local':
          if (!config.config.basePath) errors.push('Base Path is required')
          break
      }
      
      return {
        isValid: errors.length === 0,
        errors
      }
    } catch (error) {
      return {
        isValid: false,
        errors: ['Configuration not found']
      }
    }
  }

  /**
   * Refresh cache if needed
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now()
    if (now - this.lastCacheUpdate > this.cacheExpiry) {
      await this.refreshCache()
    }
  }

  /**
   * Refresh configuration cache
   */
  private async refreshCache(): Promise<void> {
    const { db } = await connectToDatabase()
    const collection = db.collection('storage_configs')
    
    const configs = await collection.find({}).toArray()
    
    this.configCache.clear()
    configs.forEach(config => {
      this.configCache.set(config.providerId, config as unknown as BaseStorageConfig)
    })
    
    this.lastCacheUpdate = Date.now()
  }

  /**
   * Invalidate cache
   */
  private invalidateCache(): void {
    this.configCache.clear()
    this.lastCacheUpdate = 0
  }
}

// Export singleton instance
export const storageConfigService = StorageConfigService.getInstance()
