import { TemplateConfig, SiteTemplateConfig } from '@/types/template'
import { TemplateOverridesService, TemplateWithOverrides } from './template-overrides'
import { SiteConfig } from '@/types/site-config'

export class TemplateService {
  private static instance: TemplateService
  private templateCache: Map<string, TemplateConfig> = new Map()
  private activeTemplate: TemplateConfig | null = null

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
      console.error('Error loading templates:', error)
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
      console.error(`Error loading template ${templateName}:`, error)
    }

    return null
  }

  // Note: Reading template config files from the filesystem is disabled in client builds

  async getActiveTemplate(): Promise<TemplateConfig | null> {
    if (this.activeTemplate) {
      return this.activeTemplate
    }

    try {
      // Use API call instead of direct service import
      const response = await fetch('/api/admin/site-config')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          const templateName = result.data.template?.activeTemplate || 'default'
          const template = await this.loadTemplate(templateName)
          if (template) {
            this.activeTemplate = template
            return template
          }
        }
      }
    } catch (error) {
      console.error('Error loading active template:', error)
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
      console.error('Error setting active template:', error)
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
      console.error(`Error loading template component ${componentName}:`, error)
      return null
    }
  }

  async getTemplatePage(templateName: string, pageName: string): Promise<any> {
    try {
      const template = await this.loadTemplate(templateName)
      if (!template) {
        return null
      }

      const pagePath = template.pages[pageName as keyof typeof template.pages]
      if (pagePath) {
        try {
          const page = await import(`@/templates/${templateName}/${pagePath}`)
          return page.default || page
        } catch (e) {
          // Fall through to default template
        }
      }

      // Fallback to default page if not defined or import failed
      const defaultTemplate = await this.getTemplateConfig('default')
      const defaultPath = defaultTemplate?.pages[pageName as keyof typeof defaultTemplate.pages]
      if (defaultPath) {
        const fallback = await import(`@/templates/default/${defaultPath}`)
        return fallback.default || fallback
      }
      return null
    } catch (error) {
      console.error(`Error loading template page ${pageName}:`, error)
      return null
    }
  }

  async getTemplateConfig(templateName: string): Promise<TemplateConfig | null> {
    // First, try to load from server-side JSON (admin API) to allow dynamic templates
    try {
      const response = await fetch('/api/admin/templates', { cache: 'no-store' })
      if (response.ok) {
        const result = await response.json()
        if (result?.success && Array.isArray(result.data)) {
          const fromJson = result.data.find((t: any) => t?.templateName === templateName)
          if (fromJson) {
            return fromJson as TemplateConfig
          }
          // Fallback to 'default' template from JSON
          const defaultJson = result.data.find((t: any) => t?.templateName === 'default')
          if (defaultJson) {
            return defaultJson as TemplateConfig
          }
        }
      }
    } catch (err) {
      // Ignore and fallback to static map below
    }
    // Final safety fallback: minimal 'default' template config
    const fallbackDefault: TemplateConfig = {
      templateName: 'default',
      displayName: 'Default',
      description: 'Fallback default template',
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
      pages: { home: 'pages/Home.tsx', gallery: 'pages/Gallery.tsx', album: 'pages/Album.tsx' },
    }
    return fallbackDefault
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
