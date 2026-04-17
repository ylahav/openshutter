import type { TemplateConfig, SiteTemplateConfig } from '$lib/types/template'
import type { FontRole } from '$lib/types/fonts'
import { normalizeFontSetting } from '$lib/types/fonts'
import { TemplateOverridesService } from './template-overrides'
import type { TemplateWithOverrides } from './template-overrides'
import type { SiteConfig } from '$lib/types/site-config'
import { logger } from '$lib/utils/logger'
import noirThemeDefaults from '$templates/noir/theme.defaults.json'
import studioThemeDefaults from '$templates/studio/theme.defaults.json'
import atelierThemeDefaults from '$templates/atelier/theme.defaults.json'

function templateFontsFromThemeJson(raw: Record<string, string | undefined>): TemplateConfig['fonts'] {
  const role = (r: FontRole) => normalizeFontSetting(raw[r], 'sans-serif', r)
  return {
    heading: role('heading'),
    body: role('body'),
    links: role('links'),
    lists: role('lists'),
    formInputs: role('formInputs'),
    formLabels: role('formLabels')
  }
}

const TEMPLATE_PACK_LOADER_FLAG = 'PUBLIC_ENABLE_TEMPLATE_PACK_LOADER'
const TEMPLATE_PACK_LOADER_ENABLED =
  String((import.meta as any)?.env?.[TEMPLATE_PACK_LOADER_FLAG] ?? '').toLowerCase() === 'true'

type TemplateConfigValidationResult = {
  valid: boolean
  missingComponents: string[]
  missingPages: string[]
}

/**
 * Static template **metadata** (colors, fonts, layout) + override helpers.
 * For runtime Svelte pack pages, use `getTemplatePack()` — not `getTemplatePage` / `getTemplateComponent`.
 */
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

  /** @deprecated References `@/templates/...` React paths; unused in Svelte packs. */
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

  /**
   * @deprecated Legacy webpack `require.context` discovery was never valid in Vite/SvelteKit.
   * Visitor routes use `getTemplatePack()` from `$lib/template/packs/registry` instead.
   */
  private buildPageLoaders(): Record<string, Record<string, () => Promise<any>>> {
    return {}
  }

  /**
   * @deprecated Unused in SvelteKit; pack pages load via `getTemplatePack()`. Always returns null.
   */
  async getTemplatePage(_templateName: string, pageName: string): Promise<any> {
    logger.debug(
      `[TemplateService] getTemplatePage("${pageName}") is deprecated; use getTemplatePack() from the template registry`
    )
    return null
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
        colors: noirThemeDefaults.colors as TemplateConfig['colors'],
        fonts: templateFontsFromThemeJson(noirThemeDefaults.fonts as Record<string, string>),
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
        displayName: studioThemeDefaults.displayName ?? 'Studio',
        description: 'Editorial portfolio layout — Syne & Outfit, hero strip, card grid',
        version: '1.0.0',
        author: 'OpenShutter',
        thumbnail: '/templates/studio/thumbnail.jpg',
        category: 'modern',
        features: { responsive: true, darkMode: true, animations: true, seoOptimized: true },
        colors: studioThemeDefaults.colors as TemplateConfig['colors'],
        fonts: templateFontsFromThemeJson(studioThemeDefaults.fonts as Record<string, string>),
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
        colors: atelierThemeDefaults.colors as TemplateConfig['colors'],
        fonts: templateFontsFromThemeJson(atelierThemeDefaults.fonts as Record<string, string>),
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
    const activeTemplateName =
      siteConfig.template?.frontendTemplate || siteConfig.template?.activeTemplate || 'noir'
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
