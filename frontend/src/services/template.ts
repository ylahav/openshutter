import type { TemplateConfig, SiteTemplateConfig } from '$lib/types/template'
import { TemplateOverridesService } from './template-overrides'
import type { TemplateWithOverrides } from './template-overrides'
import type { SiteConfig } from '$lib/types/site-config'
import { logger } from '$lib/utils/logger'

export class TemplateService {
  private static instance: TemplateService
  private templateCache: Map<string, TemplateConfig> = new Map()
  private activeTemplate: TemplateConfig | null = null
  private pageLoaders: Record<string, Record<string, () => Promise<any>>> | null = null

  private constructor() {}
  
  static getInstance(): TemplateService {
    if (!TemplateService.instance) {
      TemplateService.instance = new TemplateService()
    }
    return TemplateService.instance
  }

  async getAvailableTemplates(): Promise<TemplateConfig[]> {
    try {
      const response = await fetch('/api/admin/templates', { cache: 'no-store' })
      if (response.ok) {
        const result = await response.json()
        if (result?.success && Array.isArray(result.data)) {
          return result.data as TemplateConfig[]
        }
      }
    } catch (error) {
      logger.error('Error loading templates:', error)
    }
    return []
  }

  async loadTemplate(templateName: string): Promise<TemplateConfig | null> {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!
    }

    try {
      // Fallback to static config map
      const template = await this.getTemplateConfig(templateName)
      if (template) {
        this.templateCache.set(templateName, template)
        return template
      }
    } catch (error) {
      logger.error(`Error loading template ${templateName}:`, error)
    }

    return null
  }

  // Note: Reading template config files from the filesystem is disabled in client builds

  /**
   * Get the active template for the specified area
   * @param area 'frontend' or 'admin'. If not provided, defaults to 'frontend'
   */
  async getActiveTemplate(area: 'frontend' | 'admin' = 'frontend'): Promise<TemplateConfig | null> {
    logger.debug('getActiveTemplate', this.activeTemplate, area)
    if (this.activeTemplate) {
      return this.activeTemplate
    }

    try {
      // Use public API instead of admin API
      const response = await fetch('/api/site-config')
      if (response.ok) {
        const result = await response.json()
        logger.debug('getActiveTemplate result', result)
        if (result.success) {
          // Determine which template to use based on area
          let templateName: string
          if (area === 'admin') {
            templateName = result.data.template?.adminTemplate || result.data.template?.activeTemplate || 'default'
          } else {
            templateName = result.data.template?.frontendTemplate || result.data.template?.activeTemplate || 'modern'
          }
          const template = await this.loadTemplate(templateName)
          if (template) {
            this.activeTemplate = template
            return template
          }
        }
      }
    } catch (error) {
      logger.error('Error loading active template:', error)
    }

    // Fallback to default template
    return await this.loadTemplate('default')
  }

  async setActiveTemplate(templateName: string): Promise<boolean> {
    try {
      const template = await this.loadTemplate(templateName)
      if (!template) {
        return false
      }

      // This method is now handled by the API route directly
      // The API route will update the site config
      this.activeTemplate = template
      this.templateCache.clear() // Clear cache to force reload
      return true
    } catch (error) {
      logger.error('Error setting active template:', error)
      return false
    }
  }

  async getTemplateComponent(templateName: string, componentName: string): Promise<any> {
    try {
      const template = await this.loadTemplate(templateName)
      if (!template) {
        return null
      }

      const componentPath = template.components[componentName as keyof typeof template.components]
      if (componentPath) {
        try {
          const component = await import(`@/templates/${templateName}/${componentPath}`)
          return component.default || component
        } catch (e) {
          // Fall through to default template
        }
      }

      // Fallback to default component if not defined or import failed
      const defaultTemplate = await this.getTemplateConfig('default')
      const defaultPath = defaultTemplate?.components[componentName as keyof typeof defaultTemplate.components]
      if (defaultPath) {
        const fallback = await import(`@/templates/default/${defaultPath}`)
        return fallback.default || fallback
      }
      return null
    } catch (error) {
      logger.error(`Error loading template component ${componentName}:`, error)
      return null
    }
  }

  private buildPageLoaders(): Record<string, Record<string, () => Promise<any>>> {
    // Auto-discover all template page modules using webpack context (lazy mode for code-splitting)
    // Pattern matches: src/templates/<template>/pages/<Page>.tsx|ts
    // Note: path here is relative to this file after compilation
    //       '../templates' resolves to 'src/templates'
    // @ts-ignore - webpack's require.context() is a build-time API not recognized by TypeScript
    const ctx = require.context('../templates', true, /\/pages\/[^/]+\.(tsx|ts)$/i)
    const loaders: Record<string, Record<string, () => Promise<any>>> = {}
    ctx.keys().forEach((key: string) => {
      // Key example: './modern/pages/Login.tsx'
      const match = key.match(/^\.\/([^/]+)\/pages\/([^/.]+)\.(tsx|ts)$/i)
      if (!match) return
      const [, tName, pName] = match
      const templateKey = tName.toLowerCase()
      const pageKey = pName.toLowerCase()
      if (!loaders[templateKey]) loaders[templateKey] = {}
      loaders[templateKey][pageKey] = () => ctx(key)
    })
    return loaders
  }

  async getTemplatePage(templateName: string, pageName: string): Promise<any> {
    try {
      logger.debug(`getTemplatePage: Loading ${pageName} for template ${templateName}`)
      if (!this.pageLoaders) {
        this.pageLoaders = this.buildPageLoaders()
      }

      const tplKey = (templateName || 'default').toLowerCase()
      const pageKey = (pageName || '').toLowerCase()
      const byTemplate = this.pageLoaders[tplKey] || this.pageLoaders['default'] || {}
      const loader = byTemplate[pageKey]
      if (loader) {
        const mod = await loader()
        return mod.default || mod
      }

      // Fallback to default template
      const fallbackByDefault = this.pageLoaders['default'] || {}
      const fallbackLoader = fallbackByDefault[pageKey]
      if (fallbackLoader) {
        const mod = await fallbackLoader()
        return mod.default || mod
      }

      logger.error(`getTemplatePage: No page loader found for ${pageName}`)
      return null
    } catch (error) {
      logger.error(`Error loading template page ${pageName}:`, error)
      return null
    }
  }

  async getTemplateConfig(templateName: string): Promise<TemplateConfig | null> {
    // For public pages, use static template configurations to avoid admin API calls
    // This prevents multiple admin API calls on the homepage
    // Static template configurations for public use (no admin API calls)
    const staticTemplates: Record<string, TemplateConfig> = {
      'default': {
      templateName: 'default',
      displayName: 'Default',
        description: 'Clean and minimal template',
      version: '1.0.0',
      author: 'OpenShutter',
      thumbnail: '/templates/default/thumbnail.jpg',
      category: 'minimal',
      features: { responsive: true, darkMode: false, animations: true, seoOptimized: true },
      colors: { primary: '#3B82F6', secondary: '#1F2937', accent: '#F59E0B', background: '#FFFFFF', text: '#1F2937', muted: '#6B7280' },
      fonts: { heading: 'Inter', body: 'Inter' },
      layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' },
      components: {
        hero: 'components/Hero.tsx',
        albumCard: 'components/AlbumCard.tsx',
        photoCard: 'components/PhotoCard.tsx',
        albumList: 'components/AlbumList.tsx',
        gallery: 'components/Gallery.tsx',
        navigation: 'components/Navigation.tsx',
        footer: 'components/Footer.tsx',
      },
      visibility: { hero: true, languageSelector: true, authButtons: true, footerMenu: true },
      pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx', search: 'pages/Search.tsx' },
      },
      'modern': {
        templateName: 'modern',
        displayName: 'Modern',
        description: 'Contemporary and sleek design',
        version: '1.0.0',
        author: 'OpenShutter',
        thumbnail: '/templates/modern/thumbnail.jpg',
        category: 'modern',
        features: { responsive: true, darkMode: true, animations: true, seoOptimized: true },
        colors: { primary: '#3b82f6', secondary: '#6b7280', accent: '#10b981', background: '#ffffff', text: '#111827', muted: '#6b7280' },
        fonts: { heading: 'Inter', body: 'Inter' },
        layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' },
        components: {
          hero: 'components/Hero.tsx',
          albumCard: 'components/AlbumCard.tsx',
          photoCard: 'components/PhotoCard.tsx',
          albumList: 'components/AlbumList.tsx',
          gallery: 'components/Gallery.tsx',
          navigation: 'components/Navigation.tsx',
          footer: 'components/Footer.tsx',
        },
        visibility: { hero: true, languageSelector: true, authButtons: true, footerMenu: true },
        pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx', search: 'pages/Search.tsx' },
      },
      'elegant': {
        templateName: 'elegant',
        displayName: 'Elegant',
        description: 'Elegant and sophisticated design',
        version: '1.0.0',
        author: 'OpenShutter',
        thumbnail: '/templates/elegant/thumbnail.jpg',
        category: 'elegant',
        features: { responsive: true, darkMode: true, animations: true, seoOptimized: true },
        colors: { primary: '#8b5cf6', secondary: '#a78bfa', accent: '#f59e0b', background: '#ffffff', text: '#1f2937', muted: '#6b7280' },
        fonts: { heading: 'Playfair Display', body: 'Inter' },
        layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1.5rem' },
        components: {
          hero: 'components/Hero.tsx',
          albumCard: 'components/AlbumCard.tsx',
          photoCard: 'components/PhotoCard.tsx',
          albumList: 'components/AlbumList.tsx',
          gallery: 'components/Gallery.tsx',
          navigation: 'components/Navigation.tsx',
          footer: 'components/Footer.tsx',
        },
        visibility: { hero: true, languageSelector: true, authButtons: true, footerMenu: true },
        pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx', search: 'pages/Search.tsx' },
      },
      'minimal': {
        templateName: 'minimal',
        displayName: 'Minimal',
        description: 'Ultra-minimal and clean design',
        version: '1.0.0',
        author: 'OpenShutter',
        thumbnail: '/templates/minimal/thumbnail.jpg',
        category: 'minimal',
        features: { responsive: true, darkMode: false, animations: false, seoOptimized: true },
        colors: { primary: '#000000', secondary: '#6b7280', accent: '#000000', background: '#ffffff', text: '#000000', muted: '#6b7280' },
        fonts: { heading: 'Inter', body: 'Inter' },
        layout: { maxWidth: '1200px', containerPadding: '1rem', gridGap: '1rem' },
        components: {
          hero: 'components/Hero.tsx',
          albumCard: 'components/AlbumCard.tsx',
          photoCard: 'components/PhotoCard.tsx',
          albumList: 'components/AlbumList.tsx',
          gallery: 'components/Gallery.tsx',
          navigation: 'components/Navigation.tsx',
          footer: 'components/Footer.tsx',
        },
        visibility: { hero: true, languageSelector: true, authButtons: true, footerMenu: true },
        pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx', search: 'pages/Search.tsx' },
      }
    }
    
    // Return the requested template or default
    return staticTemplates[templateName] || staticTemplates['default']
  }

  /**
   * Get template configuration with site config overrides applied
   */
  async getTemplateWithOverrides(templateName: string, siteConfig: SiteConfig): Promise<TemplateWithOverrides | null> {
    return TemplateOverridesService.getTemplateWithOverrides(templateName, siteConfig)
  }

  /**
   * Get active template with overrides applied
   */
  async getActiveTemplateWithOverrides(siteConfig: SiteConfig): Promise<TemplateWithOverrides | null> {
    const activeTemplateName = siteConfig.template?.activeTemplate || 'default'
    return this.getTemplateWithOverrides(activeTemplateName, siteConfig)
  }

  /**
   * Update site config with template overrides
   */
  updateSiteConfigOverrides(
    siteConfig: SiteConfig,
    templateName: string,
    overrides: {
      customColors?: Partial<TemplateConfig['colors']>
      customFonts?: Partial<TemplateConfig['fonts']>
      customLayout?: Partial<TemplateConfig['layout']>
      componentVisibility?: Partial<TemplateConfig['visibility']>
      headerConfig?: TemplateConfig['componentsConfig'] extends { header: infer H } ? Partial<H> : never
    }
  ): SiteConfig {
    return TemplateOverridesService.updateSiteConfigOverrides(siteConfig, templateName, overrides)
  }

  /**
   * Reset template overrides
   */
  resetTemplateOverrides(siteConfig: SiteConfig): SiteConfig {
    return TemplateOverridesService.resetTemplateOverrides(siteConfig)
  }

  /**
   * Check if template has overrides
   */
  hasTemplateOverrides(siteConfig: SiteConfig): boolean {
    return TemplateOverridesService.hasOverrides(siteConfig)
  }

  /**
   * Get active overrides
   */
  getActiveOverrides(siteConfig: SiteConfig) {
    return TemplateOverridesService.getActiveOverrides(siteConfig)
  }
}

export const templateService = TemplateService.getInstance()
