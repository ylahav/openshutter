import { SiteConfig } from '../types/site-config'
import { TemplateConfig, FontSetting } from '../types/template'

const font = (family: string, size?: string, weight?: string): FontSetting =>
  size || weight ? { family, size, weight } : { family }

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
  noir: {
    templateName: 'noir',
    displayName: 'Noir',
    description: 'Cinematic dark layout — mono typography and full-bleed hero',
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
      lightBorderSubtle: 'rgba(0,0,0,0.08)',
    },
    fonts: {
      heading: font('DM Sans', '1.25rem', '300'),
      body: font('DM Mono', '1rem', '400'),
      links: font('DM Mono'),
      lists: font('DM Mono'),
      formInputs: font('DM Mono'),
      formLabels: font('DM Mono'),
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
      lightFooterStrip: '#0f172a',
    },
    fonts: {
      heading: font('Syne', '1.25rem', '700'),
      body: font('Outfit', '1rem', '400'),
      links: font('Outfit'),
      lists: font('Outfit'),
      formInputs: font('Outfit'),
      formLabels: font('Outfit'),
    },
    layout: { maxWidth: '1200px', containerPadding: '1.75rem', gridGap: '1rem' },
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
      lightFooterStrip: '#2c1f14',
    },
    fonts: {
      heading: font('Cormorant Garamond', '1.35rem', '400'),
      body: font('Jost', '1rem', '400'),
      links: font('Jost'),
      lists: font('Jost'),
      formInputs: font('Jost'),
      formLabels: font('Jost'),
    },
    layout: { maxWidth: '960px', containerPadding: '2rem', gridGap: '1rem' },
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
    let k =
      templateName === 'default' || templateName === 'minimal' || !templateName ? 'noir' : templateName
    k = String(k).toLowerCase()
    if (k === 'simple' || k === 'modern' || k === 'elegant') k = 'noir'
    return staticTemplates[k] || staticTemplates['noir'] || null
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
      activeTemplate = 'noir'
    } else {
      activeTemplate = siteConfig.template?.frontendTemplate || siteConfig.template?.activeTemplate || 'noir'
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
        activeTemplate: 'noir'
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
      activeTemplate = 'noir'
    } else {
      activeTemplate = siteConfig.template?.frontendTemplate || siteConfig.template?.activeTemplate || 'noir'
    }
    const templateConfig = this.getTemplateConfig(activeTemplate)
    
    if (!templateConfig) {
      return siteConfig
    }

    const updatedConfig = { ...siteConfig }
    
    if (!updatedConfig.template) {
      updatedConfig.template = {
        activeTemplate: 'noir'
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