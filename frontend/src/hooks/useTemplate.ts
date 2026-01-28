import { useState, useEffect } from 'react'
import { TemplateConfig } from '@/types/template'
import { templateService } from '@/services/template'
import { useSiteConfig } from './useSiteConfig'
import { TemplateWithOverrides } from '@/services/template-overrides'
import { logger } from '$lib/utils/logger'

export function useTemplate(templateName?: string) {
  const [template, setTemplate] = useState<TemplateConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const templateToLoad = templateName || 'default'
        const loadedTemplate = await templateService.loadTemplate(templateToLoad)
        
        if (loadedTemplate) {
          setTemplate(loadedTemplate)
        } else {
          setError(`Template '${templateToLoad}' not found`)
        }
      } catch (err) {
        logger.error('Error loading template:', err)
        setError('Failed to load template')
      } finally {
        setLoading(false)
      }
    }

    loadTemplate()
  }, [templateName])

  return { template, loading, error }
}

export function useActiveTemplate() {
  const { config } = useSiteConfig()
  const [template, setTemplate] = useState<TemplateWithOverrides | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadActiveTemplate = async () => {
      try {
        logger.debug('useActiveTemplate: Starting to load active template...')
        setLoading(true)
        setError(null)
        
        // For public pages, use basic template without overrides to avoid admin API calls
        const activeTemplate = await templateService.getActiveTemplate()
        logger.debug('useActiveTemplate: Got active template:', activeTemplate)
        if (activeTemplate) {
          setTemplate(activeTemplate as TemplateWithOverrides)
        } else {
          logger.error('useActiveTemplate: No active template found')
          setError('No active template found')
        }
      } catch (err) {
        logger.error('Error loading active template:', err)
        setError('Failed to load active template')
      } finally {
        logger.debug('useActiveTemplate: Finished loading, setting loading to false')
        setLoading(false)
      }
    }

    loadActiveTemplate()
  }, [config])

  return { template, loading, error }
}

export function useTemplateComponent(templateName: string, componentName: string) {
  const [component, setComponent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadComponent = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const loadedComponent = await templateService.getTemplateComponent(templateName, componentName)
        
        if (loadedComponent) {
          setComponent(loadedComponent)
        } else {
          setError(`Component '${componentName}' not found in template '${templateName}'`)
        }
      } catch (err) {
        logger.error('Error loading template component:', err)
        setError('Failed to load template component')
      } finally {
        setLoading(false)
      }
    }

    loadComponent()
  }, [templateName, componentName])

  return { component, loading, error }
}

export function useTemplatePage(templateName: string, pageName: string) {
  const [page, setPage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const loadedPage = await templateService.getTemplatePage(templateName, pageName)
        
        if (loadedPage) {
          setPage(loadedPage)
        } else {
          setError(`Page '${pageName}' not found in template '${templateName}'`)
        }
      } catch (err) {
        logger.error('Error loading template page:', err)
        setError('Failed to load template page')
      } finally {
        setLoading(false)
      }
    }

    loadPage()
  }, [templateName, pageName])

  return { page, loading, error }
}
