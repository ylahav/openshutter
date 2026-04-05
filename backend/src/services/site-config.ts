import { BadRequestException, Logger } from '@nestjs/common'
import { connectDB } from '../config/db'
import { SiteConfig, SiteConfigUpdate } from '../types/site-config'
import { MultiLangUtils } from '../types/multi-lang'
import mongoose from 'mongoose'
import { validateTemplatePagesLayer } from '../template/validate-pages-layer'

export class SiteConfigService {
  private readonly logger = new Logger(SiteConfigService.name)
  /** Must stay aligned with frontend `TEMPLATE_PACK_IDS` / themes `baseTemplate`. */
  private static readonly BUILTIN_TEMPLATE_IDS = new Set(['default', 'minimal', 'modern', 'elegant'])
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
    try {
      await this.refreshCacheIfNeeded()
    } catch (error) {
      // If MongoDB access fails (e.g., authentication error), use default config
      this.logger.warn(`Failed to refresh site config cache, using defaults: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.configCache = null;
    }
    
    if (!this.configCache) {
      // Return default config if none exists or if cache refresh failed
      return this.getDefaultConfig()
    }
    
    // Merge with default config to ensure all fields exist
    const defaultConfig = this.getDefaultConfig()
    const merged: SiteConfig = {
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
      },
      whiteLabel: {
        ...defaultConfig.whiteLabel,
        ...this.configCache.whiteLabel,
      }
    }
    // Admin UI is not pack-driven; keep a single legacy sentinel in API responses.
    if (merged.template) {
      merged.template = { ...merged.template, adminTemplate: 'default' }
    }
    return merged
  }

  /**
   * Deep merge helper function for nested objects
   */
  private deepMerge(target: any, source: any): any {
    const output = { ...target }
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key]) && this.isObject(target[key])) {
          output[key] = this.deepMerge(target[key], source[key])
        } else {
          output[key] = source[key]
        }
      })
    }
    
    return output
  }

  /**
   * Check if value is a plain object (not array, null, etc.)
   */
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item) && item !== null
  }

  private validateBuiltinTemplateId(value: string | undefined, field: string): void {
    if (value === undefined || value === null || value === '') return
    const v = String(value).trim().toLowerCase()
    if (!SiteConfigService.BUILTIN_TEMPLATE_IDS.has(v)) {
      throw new BadRequestException(
        `Invalid template.${field}: "${value}". Must be one of: ${[...SiteConfigService.BUILTIN_TEMPLATE_IDS].join(', ')}`
      )
    }
  }

  private validateTemplateUpdate(updates: SiteConfigUpdate): void {
    const t = updates.template
    if (!t) return
    if (t.frontendTemplate !== undefined) this.validateBuiltinTemplateId(t.frontendTemplate, 'frontendTemplate')
    // adminTemplate is legacy — not validated; persisted value is always normalized to 'default' on save.
    if (t.activeTemplate !== undefined) this.validateBuiltinTemplateId(t.activeTemplate, 'activeTemplate')
  }

  /**
   * Update site configuration
   */
  async updateConfig(updates: SiteConfigUpdate): Promise<SiteConfig> {
    const replaceTemplateFromTheme = (updates as SiteConfigUpdate & { replaceTemplateFromTheme?: boolean })
      .replaceTemplateFromTheme
    const mergePayload: SiteConfigUpdate = { ...updates }
    delete (mergePayload as { replaceTemplateFromTheme?: boolean }).replaceTemplateFromTheme

    this.validateTemplateUpdate(mergePayload)

      await connectDB()
      const db = mongoose.connection.db
      if (!db) throw new Error('Database connection not established')
    const collection = db.collection('site_config')
    
    // Get current config to merge with updates
    const currentConfig = await this.getConfig()
    
    // Deep merge updates with current config to preserve nested objects
    const mergedConfig = this.deepMerge(currentConfig, mergePayload)

    /**
     * `deepMerge` recursively merges `template.pageLayout` / `pageModules` with existing DB values.
     * That leaves stale legacy keys (e.g. flat `gridRows` on a page) next to breakpoint maps
     * (`xs`, `lg`, …), so clients treat the node as legacy and ignore responsive data — grids
     * appear not to save. When the client sends these fields, replace them entirely.
     */
    if (mergePayload.template && mergedConfig.template) {
      const t = mergePayload.template as Record<string, unknown>
      const out = mergedConfig.template as Record<string, unknown>
      const replaceWhole = [
        'pageLayout',
        'pageModules',
        'pageLayoutByBreakpoint',
        'pageModulesByBreakpoint',
        'customLayout',
        'customLayoutByBreakpoint',
        'customColors',
        'customFonts',
        'componentVisibility',
        'headerConfig',
      ] as const
      for (const k of replaceWhole) {
        if (Object.prototype.hasOwnProperty.call(t, k)) {
          out[k] = t[k]
        }
      }
      // pageModulesByBreakpoint is deprecated: keep a single source in pageModules.
      if (Object.prototype.hasOwnProperty.call(t, 'pageModules')) {
        delete out.pageModulesByBreakpoint
      }
    }

    // Applying a theme must replace module/layout/colors from the theme row, not merge with
    // leftover site_config keys (otherwise old pageModules positions persist invisibly).
    if (replaceTemplateFromTheme && mergePayload.template) {
      const t = mergePayload.template
      mergedConfig.template = mergedConfig.template || {}
      mergedConfig.template.pageModules = { ...(t.pageModules ?? {}) }
      mergedConfig.template.pageLayout = { ...(t.pageLayout ?? {}) }
      mergedConfig.template.customColors = { ...(t.customColors ?? {}) }
      mergedConfig.template.customFonts = { ...(t.customFonts ?? {}) }
      mergedConfig.template.customLayout = { ...(t.customLayout ?? {}) }
      if (Object.prototype.hasOwnProperty.call(t, 'customLayoutByBreakpoint')) {
        mergedConfig.template.customLayoutByBreakpoint = { ...(t.customLayoutByBreakpoint ?? {}) }
      }
      if (Object.prototype.hasOwnProperty.call(t, 'pageLayoutByBreakpoint')) {
        mergedConfig.template.pageLayoutByBreakpoint = { ...(t.pageLayoutByBreakpoint ?? {}) }
      }
      if (Object.prototype.hasOwnProperty.call(t, 'pageModulesByBreakpoint')) {
        // intentionally ignored; pageModules is the only persisted source now
        delete (mergedConfig.template as any).pageModulesByBreakpoint
      }
      if (Object.prototype.hasOwnProperty.call(t, 'headerConfig')) {
        mergedConfig.template.headerConfig = t.headerConfig ?? null
      }
      if (Object.prototype.hasOwnProperty.call(t, 'componentVisibility')) {
        mergedConfig.template.componentVisibility = t.componentVisibility ?? null
      }
      if (t.frontendTemplate !== undefined) mergedConfig.template.frontendTemplate = t.frontendTemplate
      if (t.activeTemplate !== undefined) mergedConfig.template.activeTemplate = t.activeTemplate
      if (t.activeThemeId !== undefined) mergedConfig.template.activeThemeId = t.activeThemeId
    }
    // Don't overwrite mail password with masked value; keep existing if update sent "****" or empty
    if (mergePayload.mail?.password === '****' || mergePayload.mail?.password === '') {
      if (mergedConfig.mail && currentConfig.mail?.password) {
        mergedConfig.mail.password = currentConfig.mail.password
      }
    }

    // Ignore any client-sent adminTemplate; admin shell is fixed (see docs/development/ADMIN_UI_ROADMAP.md).
    if (mergedConfig.template) {
      mergedConfig.template.adminTemplate = 'default'
    }

    // Server-side safety: reject invalid grids or overlapping module rectangles
    // before persisting template page placements.
    validateTemplatePagesLayer(mergedConfig.template, { source: 'PUT /api/admin/site-config' })

    this.migrateToMultiLang(mergedConfig)

    // Add updatedAt timestamp
    mergedConfig.updatedAt = new Date()
    
    await collection.updateOne(
      {}, // Update the first (and only) config document
      { $set: mergedConfig },
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

    // metaKeywords: legacy string[] or string -> MultiLangText (comma-separated per locale)
    if (config.seo) {
      const mk = config.seo.metaKeywords
      const defaultLang = config.languages?.defaultLanguage || 'en'
      if (Array.isArray(mk)) {
        const joined = mk
          .map((k) => String(k).trim())
          .filter((k) => k.length > 0)
          .join(', ')
        config.seo.metaKeywords = joined ? { [defaultLang]: joined } : {}
      } else if (typeof mk === 'string') {
        const s = mk.trim()
        config.seo.metaKeywords = s ? { [defaultLang]: s } : {}
      } else if (mk && typeof mk === 'object') {
        config.seo.metaKeywords = MultiLangUtils.clean(mk)
      } else {
        config.seo.metaKeywords = {}
      }
    }

    if (config.whiteLabel?.productName && typeof config.whiteLabel.productName === 'object') {
      config.whiteLabel.productName = MultiLangUtils.clean(config.whiteLabel.productName)
    }

    if (config.welcomeEmail) {
      const we = config.welcomeEmail
      if (typeof we.subject === 'string') {
        we.subject = we.subject.trim() ? { en: we.subject } : {}
      } else if (we.subject && typeof we.subject === 'object') {
        we.subject = MultiLangUtils.clean(we.subject)
      } else {
        we.subject = {}
      }
      if (typeof we.body === 'string') {
        we.body = we.body.trim() ? { en: we.body } : {}
      } else if (we.body && typeof we.body === 'object') {
        we.body = MultiLangUtils.clean(we.body)
      } else {
        we.body = {}
      }
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
        activeLanguages: ['en', 'he'],
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
        metaKeywords: { en: 'gallery, photos, photography, images, art' }
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
        sharingOptions: ['twitter', 'facebook', 'whatsapp', 'copy'],
        sharingOnAlbum: true,
        sharingOnPhoto: true,
        enableDownload: false,
        enableWatermark: false,
        maxUploadSize: '10MB',
        enableTagFeedbackSearchBoost: false,
      },
      template: {
        frontendTemplate: 'modern',
        adminTemplate: 'default',
        activeTemplate: 'modern' // Kept for backward compatibility
      },
      exifMetadata: { displayFields: [] },
      iptcXmpMetadata: { displayFields: [] },
      mail: {
        host: '',
        port: 587,
        user: '',
        password: '',
        from: '',
        secure: false
      },
      welcomeEmail: {
        enabled: false,
        subject: { en: 'Welcome to {{siteTitle}}' },
        body: {
          en:
            'Hi {{name}},\n\nYour account has been created. You can log in at {{loginUrl}} with username: {{username}}\n\nBest regards',
        },
      },
      whiteLabel: {
        hideOpenShutterBranding: false,
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
    try {
      await connectDB()
      const db = mongoose.connection.db
      if (!db) {
        this.logger.warn('Database connection not established, skipping cache refresh');
        this.configCache = null;
        this.lastCacheUpdate = Date.now();
        return;
      }
      
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
          },
          whiteLabel: {
            ...defaultConfig.whiteLabel,
            ...migratedConfig.whiteLabel,
          }
        } as unknown as SiteConfig
      } else {
        this.configCache = null
      }
      this.lastCacheUpdate = Date.now()
    } catch (error) {
      // If MongoDB access fails (e.g., authentication error), clear cache and use defaults
      this.logger.warn(`Failed to refresh site config cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.configCache = null;
      this.lastCacheUpdate = Date.now();
      // Don't throw - allow getConfig() to return default config
    }
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
