import type { TemplateConfig, SiteTemplateConfig } from '$lib/types/template'
import { TemplateOverridesService } from './template-overrides'
import type { TemplateWithOverrides } from './template-overrides'
import type { SiteConfig } from '$lib/types/site-config'
import { logger } from '$lib/utils/logger'

const TEMPLATE_PACK_LOADER_FLAG = 'PUBLIC_ENABLE_TEMPLATE_PACK_LOADER'
const TEMPLATE_PACK_LOADER_ENABLED =
  String((import.meta as any)?.env?.[TEMPLATE_PACK_LOADER_FLAG] ?? '').toLowerCase() === 'true'

type TemplateConfigValidationResult = {
  valid: boolean
  missingComponents: string[]
  missingPages: string[]
}

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
            templateName = 'noir'
          } else {
            templateName = result.data.template?.frontendTemplate || result.data.template?.activeTemplate || 'noir'
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

    return await this.loadTemplate('noir')
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

      const baseTemplate = await this.getTemplateConfig('noir')
      const defaultPath = baseTemplate?.components[componentName as keyof typeof baseTemplate.components]
      if (defaultPath) {
        const fallback = await import(`@/templates/noir/${defaultPath}`)
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

      const tplKey = (templateName || 'noir').toLowerCase()
      const pageKey = (pageName || '').toLowerCase()
      const byTemplate = this.pageLoaders[tplKey] || this.pageLoaders['noir'] || {}
      const loader = byTemplate[pageKey]
      if (loader) {
        const mod = await loader()
        return mod.default || mod
      }

      const fallbackByDefault = this.pageLoaders['noir'] || {}
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
    const normalizedName = (() => {
      const t = templateName === 'default' || templateName === 'minimal' || !templateName ? 'noir' : templateName
      const k = String(t).toLowerCase()
      if (k === 'simple' || k === 'modern' || k === 'elegant') return 'noir'
      return k || 'noir'
    })()

    // For public pages, use static template configurations to avoid admin API calls
    // This prevents multiple admin API calls on the homepage
    // Static template configurations for public use (no admin API calls)
    const staticTemplates: Record<string, TemplateConfig> = {
      noir: {
        templateName: 'noir',
        displayName: 'Noir',
        description: 'Cinematic dark layout — mono typography, grid hero, showcase pack',
        version: '1.0.0',
        author: 'OpenShutter',
        thumbnail: '/templates/noir/thumbnail.jpg',
        category: 'dark',
        features: { responsive: true, darkMode: true, animations: true, seoOptimized: true },
        colors: {
          primary: '#f5f5f3',
          secondary: '#a1a1a1',
          accent: '#f5f5f3',
          background: '#080808',
          text: '#f5f5f3',
          muted: 'rgba(245,245,243,0.38)',
          surfaceCard: '#141414',
          surfaceCardSecondary: '#1c1c1c',
          surfaceCardTertiary: '#232323',
          textSubtle: 'rgba(245,245,243,0.16)',
          borderSubtle: 'rgba(255,255,255,0.07)',
          lightBackground: '#f5f5f3',
          lightText: '#080808',
          lightMuted: 'rgba(8,8,8,0.45)',
          lightSurfaceCard: '#e8e8e5',
          lightSurfaceCardSecondary: '#ddddd9',
          lightSurfaceCardTertiary: '#d2d2ce',
          lightTextSubtle: 'rgba(8,8,8,0.22)',
          lightBorderSubtle: 'rgba(0,0,0,0.08)'
        },
        fonts: {
          heading: 'DM Sans',
          body: 'DM Mono',
          links: 'DM Mono',
          lists: 'DM Mono',
          formInputs: 'DM Mono',
          formLabels: 'DM Mono'
        },
        layout: { maxWidth: '1280px', containerPadding: '2rem', gridGap: '0.125rem' },
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
      studio: {
        templateName: 'studio',
        displayName: 'Studio',
        description: 'Editorial portfolio layout — Syne & Outfit, hero strip, card grid',
        version: '1.0.0',
        author: 'OpenShutter',
        thumbnail: '/templates/studio/thumbnail.jpg',
        category: 'modern',
        features: { responsive: true, darkMode: true, animations: true, seoOptimized: true },
        colors: {
          primary: '#2563eb',
          secondary: '#1d4ed8',
          accent: '#60a5fa',
          background: '#0f172a',
          text: '#f1f5f9',
          muted: '#94a3b8',
          surfaceCard: '#1e293b',
          surfaceCardSecondary: '#0f172a',
          surfaceCardTertiary: '#1e293b',
          textSubtle: 'rgba(241,245,249,0.2)',
          borderSubtle: '#334155',
          lightBackground: '#f8fafc',
          lightText: '#0f172a',
          lightMuted: '#64748b',
          lightSurfaceCard: '#ffffff',
          lightSurfaceCardSecondary: '#f8fafc',
          lightSurfaceCardTertiary: '#f1f5f9',
          lightTextSubtle: 'rgba(15,23,42,0.22)',
          lightBorderSubtle: '#e2e8f0',
          heroStrip: '#020617',
          footerStrip: '#020617',
          lightHeroStrip: '#0f172a',
          lightFooterStrip: '#0f172a'
        },
        fonts: {
          heading: 'Syne',
          body: 'Outfit',
          links: 'Outfit',
          lists: 'Outfit',
          formInputs: 'Outfit',
          formLabels: 'Outfit'
        },
        layout: { maxWidth: '1200px', containerPadding: '1.75rem', gridGap: '1rem' },
        components: {
          hero: 'components/Hero.tsx',
          albumCard: 'components/AlbumCard.tsx',
          photoCard: 'components/PhotoCard.tsx',
          albumList: 'components/AlbumList.tsx',
          gallery: 'components/Gallery.tsx',
          navigation: 'components/Navigation.tsx',
          footer: 'components/Footer.tsx'
        },
        visibility: { hero: true, languageSelector: true, authButtons: true, footerMenu: true },
        pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx', search: 'pages/Search.tsx' }
      },
      atelier: {
        templateName: 'atelier',
        displayName: 'Atelier',
        description: 'Warm editorial layout — Cormorant Garamond & Jost, tall hero, list albums',
        version: '1.0.0',
        author: 'OpenShutter',
        thumbnail: '/templates/atelier/thumbnail.jpg',
        category: 'elegant',
        features: { responsive: true, darkMode: true, animations: true, seoOptimized: true },
        colors: {
          primary: '#b8955a',
          secondary: '#5c4033',
          accent: '#d4b07a',
          background: '#1a1008',
          text: '#f0e8d8',
          muted: '#7a6a58',
          surfaceCard: '#231710',
          surfaceCardSecondary: '#1a1008',
          surfaceCardTertiary: '#2e1f14',
          textSubtle: 'rgba(240,232,216,0.25)',
          borderSubtle: '#3a2a1c',
          lightBackground: '#faf6ef',
          lightText: '#2c1f14',
          lightMuted: '#9c8c7a',
          lightSurfaceCard: '#faf6ef',
          lightSurfaceCardSecondary: '#f2ece0',
          lightSurfaceCardTertiary: '#e8dece',
          lightTextSubtle: 'rgba(44,31,20,0.35)',
          lightBorderSubtle: '#e8dece',
          heroStrip: '#0e0804',
          footerStrip: '#0e0804',
          lightHeroStrip: '#2c1f14',
          lightFooterStrip: '#2c1f14'
        },
        fonts: {
          heading: 'Cormorant Garamond',
          body: 'Jost',
          links: 'Jost',
          lists: 'Jost',
          formInputs: 'Jost',
          formLabels: 'Jost'
        },
        layout: { maxWidth: '960px', containerPadding: '2rem', gridGap: '1rem' },
        components: {
          hero: 'components/Hero.tsx',
          albumCard: 'components/AlbumCard.tsx',
          photoCard: 'components/PhotoCard.tsx',
          albumList: 'components/AlbumList.tsx',
          gallery: 'components/Gallery.tsx',
          navigation: 'components/Navigation.tsx',
          footer: 'components/Footer.tsx'
        },
        visibility: { hero: true, languageSelector: true, authButtons: true, footerMenu: true },
        pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx', search: 'pages/Search.tsx' }
      }
    }

    // Keep existing behavior during rollout unless explicitly enabled.
    if (!TEMPLATE_PACK_LOADER_ENABLED) {
      return staticTemplates[normalizedName] || staticTemplates['noir']
    }

    const selectedTemplate = staticTemplates[normalizedName]
    if (!selectedTemplate) {
      logger.warn(
        `[TemplatePackLoader] Unknown template "${templateName}", falling back to noir template`
      )
      return staticTemplates['noir']
    }

    const validation = this.validateTemplateConfig(selectedTemplate)
    if (validation.valid) {
      return selectedTemplate
    }

    logger.error(
      `[TemplatePackLoader] Invalid template "${templateName}". Missing components: ${validation.missingComponents.join(', ') || 'none'}. Missing pages: ${validation.missingPages.join(', ') || 'none'}. Falling back to noir template.`
    )
    return staticTemplates['noir']
  }

  private validateTemplateConfig(template: TemplateConfig): TemplateConfigValidationResult {
    const requiredComponents = [
      'hero',
      'albumCard',
      'photoCard',
      'albumList',
      'gallery',
      'navigation',
      'footer'
    ] as const

    const requiredPages = ['home', 'gallery', 'album', 'search'] as const

    const missingComponents = requiredComponents.filter(
      (component) => !template.components?.[component]
    )
    const missingPages = requiredPages.filter((page) => !template.pages?.[page])

    return {
      valid: missingComponents.length === 0 && missingPages.length === 0,
      missingComponents,
      missingPages
    }
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
    const activeTemplateName = siteConfig.template?.activeTemplate || 'noir'
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
