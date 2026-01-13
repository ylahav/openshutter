import { connectDB } from '../../config/db'
import mongoose from 'mongoose'
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
    await connectDB()
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')
    const collection = db.collection('storage_configs')
    
    // Build clean update data - only include fields that should be at top level
    const updateData: any = {
      providerId: providerId,
      updatedAt: new Date()
    }
    
    // Only include top-level fields that belong there
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.isEnabled !== undefined) updateData.isEnabled = updates.isEnabled
    if (updates.config !== undefined) updateData.config = updates.config
    if (updates.createdAt !== undefined) updateData.createdAt = updates.createdAt
    
    // Set createdAt if this is a new document
    const existing = await collection.findOne({ providerId })
    if (!existing && !updateData.createdAt) {
      updateData.createdAt = new Date()
    }
    
    // Ensure isEnabled is NOT in the config object (it should only be at root level)
    if (updateData.config && updateData.config.isEnabled !== undefined) {
      delete updateData.config.isEnabled
    }
    
    // Use $set to update only specified fields, and $unset to remove any duplicate top-level fields
    // that shouldn't be there (they belong in config object)
    // NOTE: We cannot use $unset on nested fields (like 'config.isEnabled') when also using $set on the parent ('config')
    // So we ensure isEnabled is removed from updateData.config before saving
    const fieldsToUnset = ['clientId', 'clientSecret', 'refreshToken', 'folderId',
                           'accessKeyId', 'secretAccessKey', 'bucketName', 'region', 'endpoint',
                           'applicationKeyId', 'applicationKey', 'basePath', 'maxFileSize']
    
    const unsetFields: Record<string, string> = {}
    fieldsToUnset.forEach(field => {
      unsetFields[field] = ''
    })
    
    // If we're updating the config object, we need to use a separate update to remove config.isEnabled
    // to avoid MongoDB conflict. We'll do this in two steps if config is being updated.
    if (updateData.config) {
      // First, update with $set (which will replace the entire config object, removing isEnabled)
      await collection.updateOne(
        { providerId },
        {
          $set: updateData,
          $unset: unsetFields
        },
        { upsert: true }
      )
      
      // Then, if config.isEnabled exists in the DB, remove it separately
      // This avoids the conflict since we're not setting config in the same operation
      await collection.updateOne(
        { providerId, 'config.isEnabled': { $exists: true } },
        { $unset: { 'config.isEnabled': '' } }
      )
    } else {
      // If we're not updating config, we can safely unset config.isEnabled in the same operation
      unsetFields['config.isEnabled'] = ''
      await collection.updateOne(
        { providerId },
        {
          $set: updateData,
          $unset: unsetFields
        },
        { upsert: true }
      )
    }
    
    // Invalidate cache
    this.invalidateCache()
  }

  /**
   * Create or update multiple configurations
   */
  async upsertConfigs(configs: Partial<BaseStorageConfig>[]): Promise<void> {
    await connectDB()
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')
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
    await connectDB()
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')
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
          folderId: ''
          // isEnabled should NOT be in config object - it's only at root level
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
          bucketName: ''
          // isEnabled should NOT be in config object - it's only at root level
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        providerId: 'backblaze' as StorageProviderId,
        name: 'Backblaze B2',
        isEnabled: false,
        config: {
          applicationKeyId: '',
          applicationKey: '',
          bucketName: '',
          region: 'us-west-2',
          endpoint: ''
          // isEnabled should NOT be in config object - it's only at root level
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        providerId: 'wasabi' as StorageProviderId,
        name: 'Wasabi',
        isEnabled: false,
        config: {
          accessKeyId: '',
          secretAccessKey: '',
          bucketName: '',
          region: 'us-east-1',
          endpoint: ''
          // isEnabled should NOT be in config object - it's only at root level
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        providerId: 'local' as StorageProviderId,
        name: 'Local Storage',
        isEnabled: false,
        config: {
          basePath: process.env.LOCAL_STORAGE_PATH || '/app/public/albums',
          maxFileSize: '100MB'
          // isEnabled should NOT be in config object - it's only at root level
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
    
    // Clean up existing records: remove isEnabled from config objects and duplicate top-level fields
    await this.cleanupExistingConfigs()
  }

  /**
   * Clean up existing configs: remove isEnabled from config objects and duplicate top-level fields
   * This is a one-time migration to fix data structure issues
   */
  async cleanupExistingConfigs(): Promise<void> {
    await connectDB()
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')
    const collection = db.collection('storage_configs')
    
    // Find all configs that have isEnabled in config object or duplicate top-level fields
    const configsToClean = await collection.find({
      $or: [
        { 'config.isEnabled': { $exists: true } },
        { clientId: { $exists: true } },
        { clientSecret: { $exists: true } },
        { refreshToken: { $exists: true } },
        { folderId: { $exists: true } },
        { accessKeyId: { $exists: true } },
        { secretAccessKey: { $exists: true } },
        { bucketName: { $exists: true } },
        { region: { $exists: true } },
        { endpoint: { $exists: true } },
        { applicationKeyId: { $exists: true } },
        { applicationKey: { $exists: true } },
        { basePath: { $exists: true } },
        { maxFileSize: { $exists: true } }
      ]
    }).toArray()
    
    if (configsToClean.length === 0) {
      console.log('[StorageConfigService] No configs need cleanup')
      return
    }
    
    console.log(`[StorageConfigService] Cleaning up ${configsToClean.length} config(s)`)
    
    for (const config of configsToClean) {
      // Remove isEnabled from config object if it exists
      if (config.config && config.config.isEnabled !== undefined) {
        const { isEnabled: _, ...cleanConfig } = config.config
        config.config = cleanConfig
      }
      
      // Build unset object for duplicate top-level fields
      const unsetFields: Record<string, string> = {}
      const fieldsToRemove = ['clientId', 'clientSecret', 'refreshToken', 'folderId',
                             'accessKeyId', 'secretAccessKey', 'bucketName', 'region', 'endpoint',
                             'applicationKeyId', 'applicationKey', 'basePath', 'maxFileSize']
      
      fieldsToRemove.forEach(field => {
        if (config[field] !== undefined) {
          unsetFields[field] = ''
        }
      })
      
      // Update the document in separate operations to avoid MongoDB conflicts
      // We can't use $set on 'config' and $unset on 'config.isEnabled' in the same operation
      
      let needsUpdate = false
      
      // Step 1: Update config object (removing isEnabled if it was there)
      if (config.config) {
        await collection.updateOne(
          { _id: config._id },
          { $set: { config: config.config } }
        )
        needsUpdate = true
      }
      
      // Step 2: Unset config.isEnabled separately (if it exists in DB)
      const hasConfigIsEnabled = await collection.findOne(
        { _id: config._id, 'config.isEnabled': { $exists: true } }
      )
      if (hasConfigIsEnabled) {
        await collection.updateOne(
          { _id: config._id },
          { $unset: { 'config.isEnabled': '' } }
        )
        needsUpdate = true
      }
      
      // Step 3: Unset duplicate top-level fields
      if (Object.keys(unsetFields).length > 0) {
        await collection.updateOne(
          { _id: config._id },
          { $unset: unsetFields }
        )
        needsUpdate = true
      }
      
      if (needsUpdate) {
        console.log(`[StorageConfigService] Cleaned up config: ${config.providerId}`)
      }
    }
    
    // Invalidate cache after cleanup
    this.invalidateCache()
    console.log('[StorageConfigService] Cleanup completed')
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
    await connectDB()
    const db = mongoose.connection.db
    if (!db) throw new Error('Database connection not established')
    const collection = db.collection('storage_configs')
    
    const configs = await collection.find({}).toArray()
    
    console.log('[StorageConfigService] Loading configs from DB:', configs.length, 'configs found')
    this.configCache.clear()
    
    configs.forEach(rawConfig => {
      console.log(`[StorageConfigService] Loading config for ${rawConfig.providerId}:`, {
        hasConfig: !!rawConfig.config,
        configKeys: rawConfig.config ? Object.keys(rawConfig.config) : [],
        isEnabled: rawConfig.isEnabled
      })
      
      // Clean the config: remove duplicate top-level fields that should only be in config object
      // Also remove isEnabled from config object (it should only be at root level)
      const rawConfigObj = rawConfig.config || {}
      const { isEnabled: _, ...cleanConfigObj } = rawConfigObj
      
      const cleanedConfig: BaseStorageConfig = {
        providerId: rawConfig.providerId,
        name: rawConfig.name,
        isEnabled: rawConfig.isEnabled !== undefined ? rawConfig.isEnabled : false,
        config: cleanConfigObj, // Config object without isEnabled
        createdAt: rawConfig.createdAt,
        updatedAt: rawConfig.updatedAt
      }
      
      // Remove any duplicate top-level fields that are also in config
      // These shouldn't be at the top level - they belong in config object
      const fieldsToRemove = ['clientId', 'clientSecret', 'refreshToken', 'folderId', 
                             'accessKeyId', 'secretAccessKey', 'bucketName', 'region', 'endpoint',
                             'applicationKeyId', 'applicationKey', 'basePath', 'maxFileSize']
      
      // Log if we detect duplicates in the raw data
      const duplicateFields = fieldsToRemove.filter(field => 
        rawConfig[field] !== undefined && rawConfig[field] !== ''
      )
      if (duplicateFields.length > 0) {
        console.warn(`[StorageConfigService] Found duplicate top-level fields in ${rawConfig.providerId}:`, duplicateFields)
      }
      
      // Log if isEnabled was found in config object (shouldn't be there)
      if (rawConfigObj.isEnabled !== undefined) {
        console.warn(`[StorageConfigService] Found isEnabled in config object for ${rawConfig.providerId}, removing it (should only be at root level)`)
      }
      
      this.configCache.set(cleanedConfig.providerId, cleanedConfig)
    })
    
    this.lastCacheUpdate = Date.now()
    console.log('[StorageConfigService] Cache refreshed, providers:', Array.from(this.configCache.keys()))
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
