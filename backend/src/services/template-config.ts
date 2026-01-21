import { SiteConfig } from '../types/site-config'
import { TemplateConfig } from '../types/template'

export interface TemplateComponentVisibility {
  hero: boolean
  languageSelector: boolean
  authButtons: boolean
  footerMenu: boolean
  statistics: boolean
  promotion: boolean
}

// Static template configurations (moved from template.ts)
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

export class TemplateConfigService {
  private static instance: TemplateConfigService

  public static getInstance(): TemplateConfigService {
    if (!TemplateConfigService.instance) {
      TemplateConfigService.instance = new TemplateConfigService()
    }
    return TemplateConfigService.instance
  }

  private getTemplateConfig(templateName: string): TemplateConfig | null {
    return staticTemplates[templateName] || staticTemplates['default'] || null
  }

  /**
   * Get the effective component visibility settings for the current template
   * This merges template defaults with site-specific overrides
   * @param siteConfig The site configuration
   * @param area Optional: 'frontend' or 'admin'. Defaults to 'frontend'
   */
  async getComponentVisibility(siteConfig: SiteConfig, area: 'frontend' | 'admin' = 'frontend'): Promise<TemplateComponentVisibility> {
    // Determine which template to use based on area
    let activeTemplate: string
    if (area === 'admin') {
      activeTemplate = siteConfig.template?.adminTemplate || siteConfig.template?.activeTemplate || 'default'
    } else {
      activeTemplate = siteConfig.template?.frontendTemplate || siteConfig.template?.activeTemplate || 'default'
    }
    const templateConfig = this.getTemplateConfig(activeTemplate)
    
    if (!templateConfig) {
      // Fallback to default settings
      return {
        hero: true,
        languageSelector: true,
        authButtons: true,
        footerMenu: true,
        statistics: true,
        promotion: true
      }
    }

    // Start with template defaults
    const visibility: TemplateComponentVisibility = {
      hero: templateConfig.visibility?.hero ?? true,
      languageSelector: templateConfig.visibility?.languageSelector ?? true,
      authButtons: templateConfig.visibility?.authButtons ?? true,
      footerMenu: templateConfig.visibility?.footerMenu ?? true,
      statistics: templateConfig.visibility?.statistics ?? true,
      promotion: templateConfig.visibility?.promotion ?? true
    }

    // Apply site-specific overrides if they exist
    if (siteConfig.template?.componentVisibility) {
      const overrides = siteConfig.template.componentVisibility
      
      if (overrides.hero !== undefined) {
        visibility.hero = overrides.hero
      }
      if (overrides.languageSelector !== undefined) {
        visibility.languageSelector = overrides.languageSelector
      }
      if (overrides.authButtons !== undefined) {
        visibility.authButtons = overrides.authButtons
      }
      if (overrides.footerMenu !== undefined) {
        visibility.footerMenu = overrides.footerMenu
      }
      if (overrides.statistics !== undefined) {
        visibility.statistics = overrides.statistics
      }
      if (overrides.promotion !== undefined) {
        visibility.promotion = overrides.promotion
      }
    }

    return visibility
  }

  /**
   * Update component visibility settings in site config
   */
  async updateComponentVisibility(
    siteConfig: SiteConfig,
    visibility: Partial<TemplateComponentVisibility>
  ): Promise<SiteConfig> {
    const updatedConfig = { ...siteConfig }
    
    if (!updatedConfig.template) {
      updatedConfig.template = {
        activeTemplate: 'default'
      }
    }

    if (!updatedConfig.template.componentVisibility) {
      updatedConfig.template.componentVisibility = {}
    }

    // Update only the provided visibility settings
    if (visibility.hero !== undefined) {
      updatedConfig.template.componentVisibility.hero = visibility.hero
    }
    if (visibility.languageSelector !== undefined) {
      updatedConfig.template.componentVisibility.languageSelector = visibility.languageSelector
    }
    if (visibility.authButtons !== undefined) {
      updatedConfig.template.componentVisibility.authButtons = visibility.authButtons
    }
    if (visibility.footerMenu !== undefined) {
      updatedConfig.template.componentVisibility.footerMenu = visibility.footerMenu
    }
    if (visibility.statistics !== undefined) {
      updatedConfig.template.componentVisibility.statistics = visibility.statistics
    }
    if (visibility.promotion !== undefined) {
      updatedConfig.template.componentVisibility.promotion = visibility.promotion
    }

    return updatedConfig
  }

  /**
   * Reset component visibility to template defaults
   * @param siteConfig The site configuration
   * @param area Optional: 'frontend' or 'admin'. Defaults to 'frontend'
   */
  async resetToTemplateDefaults(siteConfig: SiteConfig, area: 'frontend' | 'admin' = 'frontend'): Promise<SiteConfig> {
    // Determine which template to use based on area
    let activeTemplate: string
    if (area === 'admin') {
      activeTemplate = siteConfig.template?.adminTemplate || siteConfig.template?.activeTemplate || 'default'
    } else {
      activeTemplate = siteConfig.template?.frontendTemplate || siteConfig.template?.activeTemplate || 'default'
    }
    const templateConfig = this.getTemplateConfig(activeTemplate)
    
    if (!templateConfig) {
      return siteConfig
    }

    const updatedConfig = { ...siteConfig }
    
    if (!updatedConfig.template) {
      updatedConfig.template = {
        activeTemplate: 'default'
      }
    }

    // Reset to template defaults
    updatedConfig.template.componentVisibility = {
      hero: templateConfig.visibility?.hero ?? true,
      languageSelector: templateConfig.visibility?.languageSelector ?? true,
      authButtons: templateConfig.visibility?.authButtons ?? true,
      footerMenu: templateConfig.visibility?.footerMenu ?? true,
      statistics: templateConfig.visibility?.statistics ?? true,
      promotion: templateConfig.visibility?.promotion ?? true
    }

    return updatedConfig
  }

  /**
   * Get available component visibility options for a template
   */
  async getAvailableComponents(templateName: string): Promise<string[]> {
    const templateConfig = this.getTemplateConfig(templateName)
    
    if (!templateConfig) {
      return ['hero', 'languageSelector', 'authButtons', 'footerMenu', 'statistics', 'promotion']
    }

    // Return all available components
    return ['hero', 'languageSelector', 'authButtons', 'footerMenu', 'statistics', 'promotion']
  }
}

export const templateConfigService = TemplateConfigService.getInstance()