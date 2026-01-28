import { useState, useEffect } from 'react'
import { useSiteConfig } from './useSiteConfig'
import { templateConfigService, TemplateComponentVisibility } from '@/services/template-config'
import { logger } from '$lib/utils/logger'

export function useTemplateConfig() {
  const { config, loading: configLoading } = useSiteConfig()
  const [visibility, setVisibility] = useState<TemplateComponentVisibility | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadVisibility = async () => {
      if (!config) return

      try {
        setLoading(true)
        setError(null)
        
        const componentVisibility = await templateConfigService.getComponentVisibility(config)
        setVisibility(componentVisibility)
      } catch (err) {
        logger.error('Error loading template component visibility:', err)
        setError('Failed to load template configuration')
      } finally {
        setLoading(false)
      }
    }

    loadVisibility()
  }, [config])

  const updateVisibility = async (newVisibility: Partial<TemplateComponentVisibility>) => {
    if (!config) return

    try {
      setError(null)
      
      const updatedConfig = await templateConfigService.updateComponentVisibility(config, newVisibility)
      
      // Update local state immediately for better UX
      setVisibility(prev => {
        if (!prev) return null
        return {
          hero: newVisibility.hero !== undefined ? newVisibility.hero : prev.hero,
          languageSelector: newVisibility.languageSelector !== undefined ? newVisibility.languageSelector : prev.languageSelector,
          authButtons: newVisibility.authButtons !== undefined ? newVisibility.authButtons : prev.authButtons,
          footerMenu: newVisibility.footerMenu !== undefined ? newVisibility.footerMenu : prev.footerMenu,
          statistics: newVisibility.statistics !== undefined ? newVisibility.statistics : prev.statistics,
          promotion: newVisibility.promotion !== undefined ? newVisibility.promotion : prev.promotion
        }
      })
      
      // Note: The actual site config update would need to be handled by the parent component
      // or through a separate API call
      
      return updatedConfig
    } catch (err) {
      logger.error('Error updating template component visibility:', err)
      setError('Failed to update template configuration')
      throw err
    }
  }

  const resetToDefaults = async () => {
    if (!config) return

    try {
      setError(null)
      
      const updatedConfig = await templateConfigService.resetToTemplateDefaults(config)
      
      // Reload visibility settings
      const componentVisibility = await templateConfigService.getComponentVisibility(updatedConfig)
      setVisibility(componentVisibility)
      
      return updatedConfig
    } catch (err) {
      logger.error('Error resetting template configuration:', err)
      setError('Failed to reset template configuration')
      throw err
    }
  }

  return {
    visibility,
    loading: loading || configLoading,
    error,
    updateVisibility,
    resetToDefaults,
    isComponentVisible: (component: keyof TemplateComponentVisibility) => visibility?.[component] ?? true
  }
}

// Convenience hook for checking individual component visibility
export function useComponentVisibility(component: keyof TemplateComponentVisibility) {
  const { isComponentVisible, loading } = useTemplateConfig()
  
  return {
    isVisible: isComponentVisible(component),
    loading
  }
}
