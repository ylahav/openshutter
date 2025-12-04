import { connectDB } from '../config/db'
import { SiteConfig, SiteConfigUpdate } from '../types/site-config'
import { MultiLangText, MultiLangHTML, MultiLangUtils } from '../types/multi-lang'
import mongoose from 'mongoose'

export class SiteConfigService {
  private static instance: SiteConfigService
  private configCache: SiteConfig | null = null
  private cacheExpiry: number = 5 * 60 * 1000 // 5 minutes
  private lastCacheUpdate: number = 0

  private constructor() {}

  static getInstance(): SiteConfigService {
    if (!SiteConfigService.instance) {
      SiteConfigService.instance = new SiteConfigService()
    }
    return SiteConfigService.instance
  }

  /**
   * Get site configuration
   */
  async getConfig(): Promise<SiteConfig> {
    await this.refreshCacheIfNeeded()
    
    if (!this.configCache) {
      // Return default config if none exists
      return this.getDefaultConfig()
    }
    
    // Merge with default config to ensure all fields exist
    const defaultConfig = this.getDefaultConfig()
    return {
      ...defaultConfig,
      ...this.configCache,
      // Ensure languages field exists
      languages: this.configCache.languages || defaultConfig.languages,
      // Handle backward compatibility for title and description
      title: this.configCache.title || defaultConfig.title,
      description: this.configCache.description || defaultConfig.description,
      // Ensure contact.socialMedia object is properly structured
      contact: {
        ...defaultConfig.contact,
        ...this.configCache.contact,
        socialMedia: {
          ...defaultConfig.contact.socialMedia,
          ...(this.configCache.contact?.socialMedia || {})
        }
      }
    }
  }

  /**
   * Update site configuration
   */
  async updateConfig(updates: SiteConfigUpdate): Promise<SiteConfig> {
      await connectDB()
      const db = mongoose.connection.db
      if (!db) throw new Error('Database connection not established')
    const collection = db.collection('site_config')
    
    const updateData = {
      ...updates,
      updatedAt: new Date()
    }
    
    const result = await collection.updateOne(
      {}, // Update the first (and only) config document
      { $set: updateData },
      { upsert: true }
    )
    
    // Invalidate cache
    this.invalidateCache()
    
    // Return updated config
    return await this.getConfig()
  }

  /**
   * Migrate existing string-based title/description to multi-language format
   */
  private migrateToMultiLang(config: any): any {
    // Convert string title to multi-language format
    if (typeof config.title === 'string') {
      config.title = { en: config.title }
    } else if (config.title && typeof config.title === 'object') {
      // Clean existing multi-language title
      config.title = MultiLangUtils.clean(config.title)
    }
    
    // Convert string description to multi-language format
    if (typeof config.description === 'string') {
      config.description = { en: config.description }
    } else if (config.description && typeof config.description === 'object') {
      // Clean existing multi-language description
      config.description = MultiLangUtils.clean(config.description)
    }
    
    // Convert string metaTitle to multi-language format
    if (config.seo && typeof config.seo.metaTitle === 'string') {
      config.seo.metaTitle = { en: config.seo.metaTitle }
    } else if (config.seo?.metaTitle && typeof config.seo.metaTitle === 'object') {
      config.seo.metaTitle = MultiLangUtils.clean(config.seo.metaTitle)
    }
    
    // Convert string metaDescription to multi-language format
    if (config.seo && typeof config.seo.metaDescription === 'string') {
      config.seo.metaDescription = { en: config.seo.metaDescription }
    } else if (config.seo?.metaDescription && typeof config.seo.metaDescription === 'object') {
      config.seo.metaDescription = MultiLangUtils.clean(config.seo.metaDescription)
    }
    
    return config
  }

  /**
   * Initialize default configuration
   */
  async initializeDefaultConfig(): Promise<SiteConfig> {
      await connectDB()
      const db = mongoose.connection.db
      if (!db) throw new Error('Database connection not established')
    const collection = db.collection('site_config')
    
    // Check if config already exists
    const existingConfig = await collection.findOne({})
    if (existingConfig) {
      // Migrate to multi-language format if needed
      const migratedConfig = this.migrateToMultiLang(existingConfig)
      return migratedConfig as unknown as SiteConfig
    }
    
    // Create default config
    const defaultConfig = this.getDefaultConfig()
    const { _id, ...configWithoutId } = defaultConfig
    const result = await collection.insertOne(configWithoutId)
    
    return { ...defaultConfig, _id: result.insertedId.toString() }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): SiteConfig {
    return {
      title: { en: 'OpenShutter Gallery' },
      description: { en: 'A beautiful photo gallery showcasing amazing moments' },
      logo: '',
      favicon: '',
      languages: {
        activeLanguages: ['en'],
        defaultLanguage: 'en'
      },
      theme: {
        primaryColor: '#0ea5e9',
        secondaryColor: '#64748b',
        backgroundColor: '#ffffff',
        textColor: '#1e293b'
      },
      seo: {
        metaTitle: { en: 'OpenShutter Gallery - Beautiful Photo Gallery' },
        metaDescription: { en: 'Discover amazing photos in our beautiful gallery' },
        metaKeywords: ['gallery', 'photos', 'photography', 'images', 'art']
      },
      contact: {
        email: '',
        phone: '',
        address: { en: '' },
        socialMedia: {
          facebook: '',
          instagram: '',
          twitter: '',
          linkedin: ''
        }
      },
      homePage: {
        services: [],
        contactTitle: { en: 'Get In Touch' }
      },
      features: {
        enableComments: true,
        enableSharing: true,
        enableDownload: false,
        enableWatermark: false,
        maxUploadSize: '10MB'
      },
      template: {
        activeTemplate: 'modern'
      },
      createdAt: new Date(),
      updatedAt: new Date()
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
    const collection = db.collection('site_config')
    
    const config = await collection.findOne({})
    if (config) {
      // Migrate to multi-language format if needed
      const migratedConfig = this.migrateToMultiLang(config)
      
      // Merge with default config to ensure all fields exist
      const defaultConfig = this.getDefaultConfig()
      this.configCache = {
        ...defaultConfig,
        ...migratedConfig,
        // Ensure languages field exists
        languages: migratedConfig.languages || defaultConfig.languages,
        // Handle backward compatibility for title and description
        title: migratedConfig.title || defaultConfig.title,
        description: migratedConfig.description || defaultConfig.description,
        // Ensure contact.socialMedia object is properly structured
        contact: {
          ...defaultConfig.contact,
          ...migratedConfig.contact,
          socialMedia: {
            ...defaultConfig.contact.socialMedia,
            ...(migratedConfig.contact?.socialMedia || {})
          }
        }
      } as unknown as SiteConfig
    } else {
      this.configCache = null
    }
    this.lastCacheUpdate = Date.now()
  }

  /**
   * Invalidate cache
   */
  private invalidateCache(): void {
    this.configCache = null
    this.lastCacheUpdate = 0
  }

}

// Export singleton instance
export const siteConfigService = SiteConfigService.getInstance()
