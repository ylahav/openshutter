import { TemplateConfig } from '@/types/template'
import { SiteConfig } from '@/types/site-config'

export interface TemplateWithOverrides extends TemplateConfig {
  // Mark that this template has been processed with overrides
  _hasOverrides?: boolean
}

export class TemplateOverridesService {
  /**
   * Merge template configuration with site config overrides
   */
  static mergeTemplateWithOverrides(
    baseTemplate: TemplateConfig,
    siteConfig: SiteConfig
  ): TemplateWithOverrides {
    const overrides = siteConfig.template
    if (!overrides) {
      return { ...baseTemplate, _hasOverrides: false }
    }

    const merged: TemplateWithOverrides = {
      ...baseTemplate,
      _hasOverrides: true
    }

    // Merge custom colors
    if (overrides.customColors) {
      merged.colors = {
        ...baseTemplate.colors,
        ...overrides.customColors
      }
    }

    // Merge custom fonts
    if (overrides.customFonts) {
      merged.fonts = {
        ...baseTemplate.fonts,
        ...overrides.customFonts
      }
    }

    // Merge custom layout
    if (overrides.customLayout) {
      merged.layout = {
        ...baseTemplate.layout,
        ...overrides.customLayout
      }
    }

    // Merge component visibility overrides
    if (overrides.componentVisibility) {
      merged.visibility = {
        ...baseTemplate.visibility,
        ...overrides.componentVisibility
      }
    }

    // Merge header component configuration overrides
    if (overrides.headerConfig) {
      merged.componentsConfig = {
        ...baseTemplate.componentsConfig,
        header: {
          ...baseTemplate.componentsConfig?.header,
          ...overrides.headerConfig
        }
      }
    }

    return merged
  }

  /**
   * Get template configuration with overrides applied
   */
  static async getTemplateWithOverrides(
    templateName: string,
    siteConfig: SiteConfig
  ): Promise<TemplateWithOverrides | null> {
    try {
      // Load base template configuration
      const response = await fetch('/api/admin/templates', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }

      const result = await response.json()
      if (!result?.success || !Array.isArray(result.data)) {
        throw new Error('Invalid templates response')
      }

      const baseTemplate = result.data.find((t: any) => t?.templateName === templateName)
      if (!baseTemplate) {
        throw new Error(`Template '${templateName}' not found`)
      }

      // Apply overrides from site config
      return this.mergeTemplateWithOverrides(baseTemplate as TemplateConfig, siteConfig)
    } catch (error) {
      console.error('Error loading template with overrides:', error)
      return null
    }
  }

  /**
   * Update site config with template overrides
   */
  static updateSiteConfigOverrides(
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
    return {
      ...siteConfig,
      template: {
        ...siteConfig.template,
        activeTemplate: templateName,
        customColors: overrides.customColors ? {
          ...siteConfig.template?.customColors,
          ...overrides.customColors
        } : siteConfig.template?.customColors,
        customFonts: overrides.customFonts ? {
          ...siteConfig.template?.customFonts,
          ...overrides.customFonts
        } : siteConfig.template?.customFonts,
        customLayout: overrides.customLayout ? {
          ...siteConfig.template?.customLayout,
          ...overrides.customLayout
        } : siteConfig.template?.customLayout,
        componentVisibility: overrides.componentVisibility ? {
          ...siteConfig.template?.componentVisibility,
          ...overrides.componentVisibility
        } : siteConfig.template?.componentVisibility,
        headerConfig: overrides.headerConfig ? {
          ...siteConfig.template?.headerConfig,
          ...(overrides.headerConfig as any)
        } : siteConfig.template?.headerConfig
      }
    }
  }

  /**
   * Reset template overrides to base template
   */
  static resetTemplateOverrides(siteConfig: SiteConfig): SiteConfig {
    return {
      ...siteConfig,
      template: {
        activeTemplate: siteConfig.template?.activeTemplate || 'default',
        customColors: undefined,
        customFonts: undefined,
        customLayout: undefined,
        componentVisibility: undefined,
        headerConfig: undefined
      }
    }
  }

  /**
   * Check if template has any overrides
   */
  static hasOverrides(siteConfig: SiteConfig): boolean {
    const template = siteConfig.template
    if (!template) return false

    return !!(
      template.customColors ||
      template.customFonts ||
      template.customLayout ||
      template.componentVisibility ||
      template.headerConfig
    )
  }

  /**
   * Get only the override values (non-null/undefined)
   */
  static getActiveOverrides(siteConfig: SiteConfig) {
    const template = siteConfig.template
    if (!template) return {}

    const overrides: any = {}

    if (template.customColors) {
      overrides.customColors = template.customColors
    }
    if (template.customFonts) {
      overrides.customFonts = template.customFonts
    }
    if (template.customLayout) {
      overrides.customLayout = template.customLayout
    }
    if (template.componentVisibility) {
      overrides.componentVisibility = template.componentVisibility
    }
    if (template.headerConfig) {
      overrides.headerConfig = template.headerConfig
    }

    return overrides
  }
}
