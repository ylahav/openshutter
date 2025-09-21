import { useState, useEffect } from 'react'
import { useSiteConfig } from './useSiteConfig'
import { templateService } from '@/services/template'
import { TemplateWithOverrides } from '@/services/template-overrides'

export function useTemplateOverrides() {
  const { config, loading: configLoading } = useSiteConfig()
  const [template, setTemplate] = useState<TemplateWithOverrides | null>(null)
  const [hasOverrides, setHasOverrides] = useState(false)
  const [activeOverrides, setActiveOverrides] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTemplateWithOverrides = async () => {
      if (!config) return

      try {
        setLoading(true)
        setError(null)
        
        const activeTemplateName = config.template?.activeTemplate || 'default'
        const templateWithOverrides = await templateService.getTemplateWithOverrides(activeTemplateName, config)
        
        if (templateWithOverrides) {
          setTemplate(templateWithOverrides)
          setHasOverrides(templateService.hasTemplateOverrides(config))
          setActiveOverrides(templateService.getActiveOverrides(config))
        } else {
          setError('Template not found')
        }
      } catch (err) {
        console.error('Error loading template with overrides:', err)
        setError('Failed to load template with overrides')
      } finally {
        setLoading(false)
      }
    }

    loadTemplateWithOverrides()
  }, [config])

  const updateOverrides = async (overrides: {
    customColors?: Partial<TemplateWithOverrides['colors']>
    customFonts?: Partial<TemplateWithOverrides['fonts']>
    customLayout?: Partial<TemplateWithOverrides['layout']>
    componentVisibility?: Partial<TemplateWithOverrides['visibility']>
    headerConfig?: TemplateWithOverrides['componentsConfig'] extends { header: infer H } ? Partial<H> : never
  }) => {
    if (!config) return

    try {
      setError(null)
      
      const activeTemplateName = config.template?.activeTemplate || 'default'
      const response = await fetch('/api/admin/templates/overrides', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateName: activeTemplateName,
          overrides
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update template overrides')
      }

      const result = await response.json()
      if (result.success) {
        setTemplate(result.data.template)
        setHasOverrides(result.data.hasOverrides)
        setActiveOverrides(result.data.activeOverrides)
      } else {
        throw new Error(result.error || 'Failed to update template overrides')
      }
    } catch (err) {
      console.error('Error updating template overrides:', err)
      setError('Failed to update template overrides')
      throw err
    }
  }

  const resetOverrides = async () => {
    if (!config) return

    try {
      setError(null)
      
      const response = await fetch('/api/admin/templates/overrides', {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to reset template overrides')
      }

      const result = await response.json()
      if (result.success) {
        setTemplate(result.data.template)
        setHasOverrides(result.data.hasOverrides)
        setActiveOverrides(result.data.activeOverrides)
      } else {
        throw new Error(result.error || 'Failed to reset template overrides')
      }
    } catch (err) {
      console.error('Error resetting template overrides:', err)
      setError('Failed to reset template overrides')
      throw err
    }
  }

  return {
    template,
    hasOverrides,
    activeOverrides,
    loading: loading || configLoading,
    error,
    updateOverrides,
    resetOverrides
  }
}
