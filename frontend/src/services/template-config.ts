import type { SiteConfig } from '@/types/site-config'
import type { TemplateConfig } from '@/types/template'
import { templateService } from './template'

export interface TemplateComponentVisibility {
  hero: boolean
  languageSelector: boolean
  authButtons: boolean
  footerMenu: boolean
  statistics: boolean
  promotion: boolean
}

export class TemplateConfigService {
  private static instance: TemplateConfigService

  public static getInstance(): TemplateConfigService {
    if (!TemplateConfigService.instance) {
      TemplateConfigService.instance = new TemplateConfigService()
    }
    return TemplateConfigService.instance
  }

  /**
   * Get the effective component visibility settings for the current template
   * This merges template defaults with site-specific overrides
   */
  async getComponentVisibility(siteConfig: SiteConfig): Promise<TemplateComponentVisibility> {
    const activeTemplate = siteConfig.template?.activeTemplate || 'default'
    const templateConfig = await templateService.getTemplateConfig(activeTemplate)
    
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
   */
  async resetToTemplateDefaults(siteConfig: SiteConfig): Promise<SiteConfig> {
    const activeTemplate = siteConfig.template?.activeTemplate || 'default'
    const templateConfig = await templateService.getTemplateConfig(activeTemplate)
    
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
    const templateConfig = await templateService.getTemplateConfig(templateName)
    
    if (!templateConfig) {
      return ['hero', 'languageSelector', 'authButtons', 'footerMenu', 'statistics', 'promotion']
    }

    // Return all available components
    return ['hero', 'languageSelector', 'authButtons', 'footerMenu', 'statistics', 'promotion']
  }
}

export const templateConfigService = TemplateConfigService.getInstance()
